const extractFrames = require("ffmpeg-extract-frames");
const asciify = require("asciify-image");
const fs = require("fs");
const dgram = require("dgram");

let dirFiles = [];
let isExtracted = false;
const videoSeconds = 59 * 3;
const server = dgram.createSocket("udp4");
const queue = [];

server.on("error", (err) => {
  if (err) console.trace(err);

  server.close();
});

server.on("listening", async () => {
  const address = server.address();

  console.log(`server listening ${address.address}:${address.port}`);

  try {
    await extractFrames({
        input: 'media/3.mp4',
        output: './screenshots/screenshot-%i.png',
        offsets: (
            () => new Array(videoSeconds)
                .fill(100)
                .map((itm, count) => count * itm)
        )()
    });

    isExtracted = true;

    dirFiles = await fs.readdirSync("./screenshots");

    dirFiles = dirFiles.sort((prev, curr) => {
      const [, previousNameIndex] = prev.match(/\-([0-9]*)\./);
      const [, currentNameIndex] = curr.match(/\-([0-9]*)\./);

      if (+previousNameIndex < +currentNameIndex) return -1;
      else if (+previousNameIndex > +currentNameIndex) return 1;
      else return 0;
    });

    console.log(dirFiles);

    for (const handler of queue) {
      await handler?.();
    }

  } catch (error) {
    console.error(error);

    throw new Error("Video could not be processed");
  }
});

server.bind(41234);

const options = {
  fit: "box",
  width: 40,
  height: 40,
};

server.on("message", async (msg, rinfo) => {
  console.warn(msg.toString("utf8"));
  
  const msgString = msg.toString("utf8");

  if (msgString === "start") {
    const startMessageHandler = async () =>
      await server.send(
        JSON.stringify(dirFiles),
        rinfo.port,
        rinfo.address,
        (err) => {
          if (err) console.trace(err);
        }
      );

    if (isExtracted) return await startMessageHandler();
    queue.push(startMessageHandler);
  } else if (msgString.length) {
    try {
      const frameASCIIImage = await asciify(
        `./screenshots/${msgString}`,
        options
      );

      server.send(
        `${msgString}----\n${frameASCIIImage}`,
        rinfo.port,
        rinfo.address,
        (err) => {
          if (err) console.trace(err);
        }
      );
    } catch (e) {
      console.log("Too many frames...");
    }
  }
});
