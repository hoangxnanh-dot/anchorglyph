// THE VIDEO RECORDER
//
// Records the drawing as a video while it runs, so a saved variation can be
// exported as an MP4 film of how it came to be, up to the moment it was
// saved.
//
//   const recorder = createVideoRecorder({ height: 1440 });
//   recorder.addFrame(canvas, left, top, width, height, extra);  every frame
//   const recording = await recorder.snapshot();   the video up to now
//   recorder.reset();                              start a new video
//   const file = mp4File(recording);               an MP4 file (Blob)
//
// Every frame is cut out of the canvas, made smaller to the video's size and
// handed to the browser's own video encoder (WebCodecs), which squeezes it
// into H.264, the format nearly every player and design tool opens. The
// encoded frames are kept in memory. snapshot() hands out the ones so far,
// and recording simply continues, so a later snapshot is a longer video
// from the same start.
//
// `extra` is anything the caller wants to keep with a frame (the sketch keeps
// where the anchors were). The recording holds them in `extras`, one per
// frame, so a frame can be redrawn later with more on top: createFrameReader()
// plays a recording back frame by frame for that.
//
// Each frame lasts 1/60 of a second in the video, however long the computer
// took to draw it: the video plays smoothly, at the speed the drawing has
// on a computer that keeps up.
//
// Browsers without WebCodecs (or without H.264 in it) record nothing, and
// snapshot() gives back null.

// How many frames the video shows per second.
const FRAMES_PER_SECOND = 60;
// How much data a second of video may take, in bits. More is sharper and
// bigger: 12 million is about 1.5 MB per second.
const BITS_PER_SECOND = 12_000_000;
// Every this many frames, a frame is stored whole (a "key frame"); the ones
// in between only store what changed. More often makes the file bigger,
// less often makes jumping around in a player slower.
const KEY_FRAME_EVERY = FRAMES_PER_SECOND * 2;
// H.264 "High" profile, level 5.1: big enough for a 1440 pixel video, also
// when a slanted grid makes it wider than tall.
const CODEC = 'avc1.640033';
// The encoder works in millionths of a second.
const MICROSECONDS_PER_SECOND = 1_000_000;
// If the encoder falls this many frames behind, addFrame() leaves the frame
// out until it catches up, so the drawing doesn't slow down.
const MAX_WAITING_FRAMES = 30;
// How many frames the reader unpacks ahead. Unpacked frames are large, so
// only a few are kept waiting.
const READ_AHEAD = 8;

// Every MP4 box starts with 8 bytes: its size and its four-letter name.
const BOX_HEADER_SIZE = 8;

export function createVideoRecorder({ height }) {
  const supported = typeof VideoEncoder !== 'undefined';
  // the frames are drawn onto this canvas at the video's size first
  const frameCanvas = document.createElement('canvas');
  const frameContext = frameCanvas.getContext('2d');

  let encoder = null;
  // the encoded frames so far: { data, isKeyFrame, timestamp }
  let encodedFrames = [];
  // what each frame was given to keep, in the same order
  let extras = [];
  // what a player needs to know to read the frames, from the encoder
  let decoderDescription = null;
  let frameCount = 0;
  // set after a snapshot, so the next frame is stored whole again
  let nextIsKeyFrame = true;
  // something went wrong in the encoder: record nothing until reset()
  let broken = false;

  function start(width) {
    frameCanvas.width = width;
    frameCanvas.height = height;
    encoder = new VideoEncoder({
      output: (chunk, metadata) => {
        const data = new Uint8Array(chunk.byteLength);
        chunk.copyTo(data);
        encodedFrames.push({ data, isKeyFrame: chunk.type === 'key', timestamp: chunk.timestamp });
        if (metadata?.decoderConfig?.description) {
          decoderDescription = new Uint8Array(metadata.decoderConfig.description);
        }
      },
      error: () => {
        broken = true;
      },
    });
    // avc: 'avc' gives the frames in the form an MP4 file stores them
    encoder.configure({
      codec: CODEC,
      width,
      height,
      bitrate: BITS_PER_SECOND,
      framerate: FRAMES_PER_SECOND,
      avc: { format: 'avc' },
    });
  }

  // Adds one frame: the part of `source` (a canvas) from `left`, `top`,
  // `sourceWidth` × `sourceHeight` pixels, made the video's height. The
  // width follows its shape, rounded to an even number, which H.264 needs.
  // If the shape changes (the grid's slant), a new video starts.
  // Gives back whether the frame was added: false while the encoder is
  // too far behind, or if the browser can't record.
  function addFrame(source, left, top, sourceWidth, sourceHeight, extra = null) {
    if (!supported || broken) return false;
    const width = Math.round((height * sourceWidth) / sourceHeight / 2) * 2;
    if (encoder && width !== frameCanvas.width) reset();
    if (!encoder) start(width);
    if (encoder.state !== 'configured' || encoder.encodeQueueSize > MAX_WAITING_FRAMES) return false;

    frameContext.drawImage(source, left, top, sourceWidth, sourceHeight, 0, 0, frameCanvas.width, frameCanvas.height);
    const frameDuration = MICROSECONDS_PER_SECOND / FRAMES_PER_SECOND;
    const frame = new VideoFrame(frameCanvas, {
      timestamp: Math.round(frameCount * frameDuration),
      duration: Math.round(frameDuration),
    });
    const isKeyFrame = nextIsKeyFrame || frameCount % KEY_FRAME_EVERY === 0;
    encoder.encode(frame, { keyFrame: isKeyFrame });
    frame.close();
    extras.push(extra);
    nextIsKeyFrame = false;
    frameCount += 1;
    return true;
  }

  // The video from its first frame up to the last one added:
  // { width, height, frames, description, extras }. null when nothing was
  // recorded (or the browser can't).
  async function snapshot() {
    if (!encoder || broken || frameCount === 0) return null;
    const recording = encoder;
    const lastTimestamp = Math.round(((frameCount - 1) * MICROSECONDS_PER_SECOND) / FRAMES_PER_SECOND);
    try {
      // waits until every frame added so far is encoded
      await recording.flush();
    } catch {
      // reset() closed the encoder meanwhile: that video is gone
      return null;
    }
    if (recording !== encoder || !decoderDescription) return null;
    nextIsKeyFrame = true;
    // frames added after the snapshot was asked for are left out
    const frames = encodedFrames.filter((frame) => frame.timestamp <= lastTimestamp);
    return {
      width: frameCanvas.width,
      height,
      frames,
      description: decoderDescription,
      extras: extras.slice(0, frames.length),
    };
  }

  // Throws the recording away; the next frame starts a new video.
  function reset() {
    if (encoder && encoder.state !== 'closed') encoder.close();
    encoder = null;
    encodedFrames = [];
    extras = [];
    decoderDescription = null;
    frameCount = 0;
    nextIsKeyFrame = true;
    broken = false;
  }

  return { addFrame, snapshot, reset };
}

// Plays a recording back, frame by frame, as pictures that can be drawn
// onto a canvas (VideoFrames). take() gives the next one, or null while it
// is still being unpacked; call it again a moment later. Each frame taken
// must be closed with frame.close() once it is drawn, or the browser runs
// out of room for new ones. close() ends the reading.
export function createFrameReader({ frames, description, width, height }) {
  const unpacked = [];
  let handedIn = 0;
  let failed = false;
  const decoder = new VideoDecoder({
    output: (frame) => unpacked.push(frame),
    error: () => {
      failed = true;
    },
  });
  decoder.configure({ codec: CODEC, codedWidth: width, codedHeight: height, description });

  // hands the decoder the next frames, a few ahead of what is taken
  function readAhead() {
    while (handedIn < frames.length && unpacked.length + decoder.decodeQueueSize < READ_AHEAD) {
      const { data, isKeyFrame, timestamp } = frames[handedIn];
      decoder.decode(new EncodedVideoChunk({ type: isKeyFrame ? 'key' : 'delta', timestamp, data }));
      handedIn += 1;
      // the last frames only come out once the decoder knows nothing follows
      if (handedIn === frames.length) decoder.flush().catch(() => {});
    }
  }

  return {
    take() {
      if (failed) return null;
      readAhead();
      const frame = unpacked.shift() ?? null;
      readAhead();
      return frame;
    },
    hasFailed: () => failed,
    close() {
      for (const frame of unpacked) frame.close();
      unpacked.length = 0;
      if (decoder.state !== 'closed') decoder.close();
    },
  };
}

// Packs encoded H.264 frames into an MP4 file. An MP4 file is a row of
// "boxes": each one starts with its size and a four-letter name, then its
// contents, which may be more boxes. This writes the few boxes a player
// needs: what kind of file it is (ftyp), the frames themselves (mdat), and
// the description of the video (moov): its size, how long each frame
// lasts, which frames are key frames, and where in mdat each one sits.
export function mp4File({ width, height, frames, description }) {
  // the file counts time in frames: each frame lasts 1 of these units
  const timescale = FRAMES_PER_SECOND;
  const frameTotal = frames.length;
  const frameSizes = frames.map((frame) => frame.data.byteLength);
  const dataSize = frameSizes.reduce((sum, size) => sum + size, 0);

  const MINOR_VERSION = 0x200;
  const fileType = box('ftyp', text('isom'), u32(MINOR_VERSION), text('isom'), text('iso2'), text('avc1'), text('mp41'));
  // the frames start right after mdat's own size and name
  const firstFrameOffset = fileType.byteLength + BOX_HEADER_SIZE;

  // 1 in the middle of 16.16 numbers, and the "do not turn or move" matrix
  const ONE_FIXED = 0x00010000;
  const ONE_FIXED_2_30 = 0x40000000;
  const matrix = [u32(ONE_FIXED), u32(0), u32(0), u32(0), u32(ONE_FIXED), u32(0), u32(0), u32(0), u32(ONE_FIXED_2_30)];
  const TRACK_ID = 1;
  // 'und' (undetermined), packed into three 5-bit letters, as MP4 wants
  const LANGUAGE_UNDETERMINED = 0x55c4;
  // 72 pixels per inch, written as 16.16
  const SEVENTY_TWO_DPI = 0x00480000;
  const COLOR_DEPTH = 0x0018;
  // full volume (1.0 as 8.8), and "no color table" (-1)
  const FULL_VOLUME = 0x0100;
  const NO_COLOR_TABLE = 0xffff;
  // flags: the track is switched on and part of the movie; the frames are
  // in this same file; the video header's one required flag
  const TRACK_ENABLED = 3;
  const DATA_IN_THIS_FILE = 1;
  const VIDEO_HEADER_FLAGS = 1;

  const movieHeader = fullBox('mvhd', 0, 0,
    u32(0), u32(0), u32(timescale), u32(frameTotal),
    u32(ONE_FIXED), u16(FULL_VOLUME), zeros(10), ...matrix, zeros(24), u32(TRACK_ID + 1));

  const trackHeader = fullBox('tkhd', 0, TRACK_ENABLED,
    u32(0), u32(0), u32(TRACK_ID), u32(0), u32(frameTotal),
    zeros(8), u16(0), u16(0), u16(0), u16(0), ...matrix,
    u32(width * ONE_FIXED), u32(height * ONE_FIXED));

  const mediaHeader = fullBox('mdhd', 0, 0,
    u32(0), u32(0), u32(timescale), u32(frameTotal), u16(LANGUAGE_UNDETERMINED), u16(0));
  const handler = fullBox('hdlr', 0, 0, u32(0), text('vide'), zeros(12), text('VideoHandler\0'));

  const sampleEntry = box('avc1',
    zeros(6), u16(1), zeros(16), u16(width), u16(height),
    u32(SEVENTY_TWO_DPI), u32(SEVENTY_TWO_DPI), u32(0), u16(1), zeros(32),
    u16(COLOR_DEPTH), u16(NO_COLOR_TABLE), box('avcC', description));

  const keyFrameNumbers = frames.flatMap((frame, index) => (frame.isKeyFrame ? [u32(index + 1)] : []));
  const sampleTable = box('stbl',
    fullBox('stsd', 0, 0, u32(1), sampleEntry),
    // every frame lasts 1 unit
    fullBox('stts', 0, 0, u32(1), u32(frameTotal), u32(1)),
    fullBox('stss', 0, 0, u32(keyFrameNumbers.length), ...keyFrameNumbers),
    // all frames sit in one block, one after the other
    fullBox('stsc', 0, 0, u32(1), u32(1), u32(frameTotal), u32(1)),
    fullBox('stsz', 0, 0, u32(0), u32(frameTotal), ...frameSizes.map(u32)),
    fullBox('stco', 0, 0, u32(1), u32(firstFrameOffset)));

  const mediaInformation = box('minf',
    fullBox('vmhd', 0, VIDEO_HEADER_FLAGS, zeros(8)),
    box('dinf', fullBox('dref', 0, 0, u32(1), fullBox('url ', 0, DATA_IN_THIS_FILE))),
    sampleTable);

  const movie = box('moov',
    movieHeader,
    box('trak', trackHeader, box('mdia', mediaHeader, handler, mediaInformation)));

  // mdat is written as its header plus the frames, without copying them
  // into one big piece first
  const mediaDataHeader = concat(u32(BOX_HEADER_SIZE + dataSize), text('mdat'));
  return new Blob([fileType, mediaDataHeader, ...frames.map((frame) => frame.data), movie], { type: 'video/mp4' });
}

// A box: its size, its four-letter name, then its contents
function box(name, ...contents) {
  const body = concat(...contents);
  return concat(u32(body.byteLength + BOX_HEADER_SIZE), text(name), body);
}

// A "full" box also has a version number and flags before its contents
function fullBox(name, version, flags, ...contents) {
  return box(name, u8(version), u8(flags >> 16), u16(flags & 0xffff), ...contents);
}

function concat(...parts) {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.byteLength;
  }
  return joined;
}

// Numbers as 1, 2 or 4 bytes, biggest part first, as MP4 writes them
function u8(value) {
  return new Uint8Array([value]);
}

function u16(value) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value);
  return bytes;
}

function u32(value) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value);
  return bytes;
}

function text(letters) {
  return new TextEncoder().encode(letters);
}

function zeros(count) {
  return new Uint8Array(count);
}
