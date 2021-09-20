import Webcam from './lib/webcam';
import Screen from './lib/screenmedia';
import { Regl, Texture2D } from 'regl';

interface HydraSourceOptions {
  regl: HydraSource['regl'];
  width: HydraSource['width'];
  height: HydraSource['height'];
  pb: HydraSource['pb'];
  label: HydraSource['label'];
}

export default class HydraSource {
  regl: Regl;
  width: number;
  height: number;
  pb: any;
  label: string;
  src: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | CanvasRenderingContext2D | null;
  dynamic: boolean;
  tex: Texture2D;

  constructor({ regl, width, height, pb, label = '' }: HydraSourceOptions) {
    this.label = label;
    this.regl = regl;
    this.src = null;
    this.dynamic = true;
    this.width = width;
    this.height = height;
    this.tex = this.regl.texture({
      //  shape: [width, height]
      shape: [1, 1],
    });
    this.pb = pb;
  }

  init(opts: { src: HydraSource['src']; dynamic: boolean }) {
    if (opts.src) {
      this.src = opts.src;
      this.tex = this.regl.texture(this.src);
    }
    if (opts.dynamic) this.dynamic = opts.dynamic;
  }

  initCam(index: number) {
    const self = this;
    Webcam(index)
      .then((response) => {
        // @ts-ignore
        self.src = response.video;
        self.dynamic = true;
        self.tex = self.regl.texture(response.video);
      })
      .catch((err) => console.log('could not get camera', err));
  }

  initVideo(url = '') {
    // const self = this
    const vid = document.createElement('video');
    vid.crossOrigin = 'anonymous';
    vid.autoplay = true;
    vid.loop = true;
    vid.muted = true; // mute in order to load without user interaction
    vid.addEventListener('loadeddata', () => {
      this.src = vid;
      vid.play();
      this.tex = this.regl.texture(this.src);
      this.dynamic = true;
    });
    vid.src = url;
  }

  initImage(url = '') {
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => {
      this.src = img;
      this.dynamic = false;
      this.tex = this.regl.texture(this.src);
    };
  }

  initStream(streamName: string) {
    //  console.log("initing stream!", streamName)
    let self = this;
    if (streamName && this.pb) {
      this.pb.initSource(streamName);

      this.pb.on('got video', function (nick: string, video: HTMLVideoElement) {
        if (nick === streamName) {
          self.src = video;
          self.dynamic = true;
          self.tex = self.regl.texture(self.src);
        }
      });
    }
  }

  initScreen() {
    const self = this;
    Screen()
      .then(function (response) {
        self.src = response.video;
        self.tex = self.regl.texture(self.src);
        self.dynamic = true;
        //  console.log("received screen input")
      })
      .catch((err) => console.log('could not get screen', err));
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  clear() {
    if (this.src && 'srcObject' in this.src && this.src.srcObject) {
      if ('getTracks' in this.src.srcObject && this.src.srcObject.getTracks) {
        this.src.srcObject.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
    }
    this.src = null;
    this.tex = this.regl.texture({ shape: [1, 1] });
  }

  tick(dt?: number) {
    //  console.log(this.src, this.tex.width, this.tex.height)
    if (this.src !== null && this.dynamic) {
      if ('videoWidth' in this.src && this.src.videoWidth !== this.tex.width) {
        this.tex.resize(this.src.videoWidth, this.src.videoHeight);
      }

      if ('width' in this.src && this.src.width !== this.tex.width) {
        this.tex.resize(this.src.width, this.src.height);
      }

      this.tex.subimage(this.src);
    }
  }

  getTexture() {
    return this.tex;
  }
}
