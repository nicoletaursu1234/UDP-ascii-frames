const dgram = require('dgram');

let frames;
let counter = 0;
const client = dgram.createSocket('udp4');
const startArgs = ['start', 41234, '127.0.0.1'];

client.send(...startArgs, (err) => {
    if (err) setTimeout(async () => await client.send(...startArgs), 1000);
});

const delay = () => new Promise((resolve) => {
    setTimeout(() => resolve(), 150);
});

const showSlides = async () => {
    for (const frame of frames) {
        console.clear();
        console.warn(frame);

        await delay();
    }

    client.close();
};

client.on('message', async (msg, err) => {
    const msgString = msg.toString('utf8');

    if (!frames && msgString.length) {
        try {
            frames = JSON.parse(msgString)
            console.warn('frame', frames)

            client.send(frames[counter], startArgs[1], startArgs[2]);
            counter++;
        } catch (error) {
            await client.send(...startArgs, (error) => {
                if (err) console.trace(error);
                counter++;
            });
        }
    } else if (msgString.length) {
        const [frameName, frame] = msgString.split('----\n');
        const frameIndex = frames.findIndex(itm => itm === frameName);

        if (frames && frames[frameIndex]) frames[frameIndex] = frame;

        if (frames[counter]) {
            await client.send(frames[counter], startArgs[1], startArgs[2], (error) => {
                if (error) console.trace(error);
                counter++;
            });
        } else {
            showSlides();
        }
    } else {
        await client.send(...startArgs);
    }
});