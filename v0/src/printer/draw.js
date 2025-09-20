import { mkcanvas } from "./utility.js";
import { splitText } from 'canvas-txt'
import { updateImage } from './image-worker.js';

export function drawStuff(can_width, stuff, index) {
    // const [imgsrc, set_imgsrc] = useState(STUFF_PAINT_INIT_URL);
   
    const { canvas, width, ctx, img } = mkcanvas(can_width);
    let font;
    let strings;
    let measured;
    let line_height;
    let msg;
    let imagedata;
    let anchor_x, anchor_y;
    
    switch (stuff.type) {
        case 'text':
            ctx.fillStyle = 'black';
            ctx.strokeStyle = 'black';
            ctx.textAlign = stuff.textAlign === 'justify' ? 'start' : stuff.textAlign;
            font = `${stuff.textFontWeight} ${stuff.textFontSize}px "${stuff.textFontFamily}"`;
            // ctx.font is set multiple times intensionally
            ctx.font = font;
            strings = splitText({
                ctx: ctx,
                text: stuff.textContent,
                justify: stuff.textAlign === 'justify',
                width: width
            });
            ctx.font = font;
            measured = strings.map(s => ctx.measureText(s));
            line_height = stuff.textLineSpacing + Math.max(...measured.map(m => m.actualBoundingBoxAscent), stuff.textFontSize);
            canvas.height = line_height * strings.length + stuff.textLineSpacing;
            ctx.font = font;
            for (let i = 0; i < strings.length; ++i) {
                const s = strings[i];
                anchor_x = ({
                    'start': 0,
                    'center': (width / 2 - measured[i].width / 2) | 0,
                    'end': (width - measured[i].width) | 0,
                    'justify': 0
                })[stuff.textAlign] + (stuff.textShift * width);
                anchor_y = line_height * (i + 1);
                if (stuff.textStroked) {
                    ctx.strokeText(s, anchor_x, anchor_y);
                } else {
                    ctx.fillText(s, anchor_x, anchor_y);
                }
            }
            break;
        case 'pic':
            img.src = stuff.picUrl;
                
            if (stuff.rotate === 0 || stuff.rotate === 180) {
                img.height = width / (img.width / img.height) | 0;
                img.width = width;
            } else {
                img.width = width * (img.width / img.height) | 0;
                img.height = width;
            }
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            break;
    }

    message = { 
        id: stuff.id,
        dither: stuff.dither,
        rotate: stuff.rotate,
        flip: stuff.flipH ? (stuff.flipV ? 'both' : 'h') : (stuff.flipV ? 'v' : 'none'),
        brightness: stuff.brightness,
        data: ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer,
        width: canvas.width,
        height: canvas.height
    }

    msg = updateImage(message)
   
    stuff.width = canvas.width = msg.width;
    stuff.height = canvas.height = msg.height;
    imagedata = new ImageData(new Uint8ClampedArray(msg.data), msg.width, msg.height);
    ctx.putImageData(imagedata, 0, 0);

    return {
            index: index,
            width: canvas.width,
            height: canvas.height,
            data: new Uint8Array(imagedata.data.buffer)
    }

}