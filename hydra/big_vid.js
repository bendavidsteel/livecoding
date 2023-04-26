const Meyda = require('meyda')
p1 = new P5();

theShader = p1.loadShader(atom.project.getPaths()[0]+'/shaders/generic.vert', atom.project.getPaths()[0]+'/shaders/fractals.frag');
// shaders require WEBGL mode to work
p1.createCanvas(600, 300, p1.WEBGL);
p1.noStroke();

fractal_type = 2;
scale = -1;
transform_1 = 0;
transform_2 = 0;
ambient = 0;
camera_amp = 1;
camera_speed = 1;
change_counter_1 = 0;
change_counter_2 = 0;
max_change_counter_1 = 80;
max_change_counter_2 = 40;

numBins = 4
cutoff = 0.05
smooth = 0.995
max = 3
vol = 0
vol_mov_avg = 0;
bins = Array(numBins).fill(0)
prevBins = Array(numBins).fill(0)
fft = Array(numBins).fill(0)

vid_names = ['Magnapinna_Squid_Filmed_at_Drilling_Site-GSXqqi3ShOs.webm',
'North_Sea_Big_Wave-gPy2DHHnlqQ.webm',
'Time_Lapse_of_Ancient_Liverwort_Plant_Taking_Over_the_Planter-F9uVjCIgbQk.mp4'];

vid = document.createElement('video')
vid.autoplay = true
vid.loop = true
vid.muted = true
// get path to video using getPaths() representing current directory in atom
vid.src = atom.project.getPaths()[0]+'/assets/' + vid_names[0];

audio = document.createElement("audio");
audio.loop = true;
audio.src = atom.project.getPaths()[0]+'/assets/Master.wav';
context = new AudioContext();
source = context.createMediaElementSource(audio);
source.connect(context.destination);

const analyzer = Meyda.createMeydaAnalyzer({
  audioContext: context,
  source: source,
  featureExtractors: [
    'loudness',
  //  'perceptualSpread',
  //  'perceptualSharpness',
  //  'spectralCentroid'
  ],
  callback: (features) => {
    if(features && features !== null){
      // reduce loudness array to number of bins
      const reducer = (accumulator, currentValue) => accumulator + currentValue;
      let spacing = Math.floor(features.loudness.specific.length/bins.length)
      prevBins = bins.slice(0)
      bins = bins.map((bin, index) => {
        return features.loudness.specific.slice(index * spacing, (index + 1)*spacing).reduce(reducer)
      }).map((bin, index) => {
        // map to specified range
        return (bin * (1.0 - smooth) + prevBins[index] * smooth)
      })
      fft = bins.map((bin) => (
        Math.max(0, (bin - cutoff) / (max - cutoff))
      ))
      vol = fft.reduce((a, b) => a + b, 0)
    }
  }
})
analyzer.start();


p1.draw = () => {
  if (fractal_type == 0) {
    scale = -1
  } else {
    scale = vol;
  }
  vol_mov_avg = (0.999 * vol_mov_avg) + (0.001 * vol)
  ambient = Math.sin(vol**8);
  if (fractal_type == 2) {
    camera_amp = (vol_mov_avg*2);
    camera_speed = (vol_mov_avg*2) / 2;
  } else if (fractal_type == 1) {
    camera_amp = (vol_mov_avg*2);
    camera_speed = (vol_mov_avg*2) / 10;
  } else if (fractal_type == 3) {
    camera_amp = 1;
    camera_speed = 1;
  }
  // small change zone
  if (vol > 1.2) {
    change_counter_1 += 1;
  }
  if (change_counter_1 == max_change_counter_1) {
    change_counter_1 = 0;
    if (fractal_type == 1 || fractal_type == 2) {
      transform_1 = fft[0] ** 2
      transform_2 = fft[1] ** 2
    } else {
      transform_1 = (fft[0] ** 2) / 6
      transform_2 = (fft[1] ** 2) / 6
    }
    if (vol > 0 && vol <= 1.4) {
      src(s1).out()
    }
    if (vol > 1.4 && vol <= 1.7) {
      src(s1)
        .color(fft[0],fft[1],fft[2])
        .saturate(1.2)
        .out()
    }
    if (vol > 1.7 && vol <= 2.1) {
      src(s1)
        .color(fft[3],fft[2],fft[1])
        .saturate(1.5)
        .out()
    }
    if (vol > 2.1 && vol <= 2.3) {
      osc(1,0.5,1)
        .add(o0, () => (Math.sin(time/4) * 0.2 + fft[1]))
        .scale(()=>Math.sin(time / 16)).rotate(0, -0.1)
        .modulate(s1, 5)
        .out()
    }
    if (vol > 2.3 && vol <= 3) {
      osc(0.7,0.8,1)
        .color(0.8, 0.9, 0.3)
        .add(o0, () => (Math.sin(time/4) * 0.2 + fft[1]))
        .scale(()=>Math.sin(time / 16)).rotate(0, -0.1)
        .modulate(s1, 5)
        .out()
    }
  }
  // big change zone
  min_change = 1.9
  if (vol > min_change) {
    change_counter_2 += 1;
  }
  if (change_counter_2 == max_change_counter_2) {
    change_counter_2 = 0;
    if (vol > min_change && vol <= 2.4) {
      if (fractal_type < 3) {
        fractal_type += 1
      } else {
        fractal_type = 1
      }
      camera_amp = 2
      if (fractal_type == 1) {
        camera_speed = 0.1
      }
      if (fractal_type == 3) {
        transform_1 = 0;
        transform_2 = 0;
      }
    }
    if (vol > 2.5 && vol <= 2.55) {
      osc(1,0.5,1)
        .add(o0, () => (Math.sin(time/4) * 0.2 + fft[1]))
        .scale(()=>Math.sin(time / 16)).rotate(0, -0.1)
        .modulate(s2, 5)
        .out()
    }
    if (vol > 2.55) {
      src(s2)
      	.color(0.4,0.8,0.3).contrast(1.4)
      	.add(src(o0).modulate(o0,.04),.6)
      	.invert().brightness(0.1).contrast(1.2)
      	.modulateScale(osc(2),-0.2)
        .out()
    }
    //video stuff
    vid.src = atom.project.getPaths()[0]+'/assets/' + vid_names[Math.floor(Math.random() * vid_names.length)]
    randomTime = Math.floor(Math.random() * 14);
    if (Number.isFinite(randomTime)) {
      vid.currentTime = randomTime;
    }
  }
  // apply fractal
  p1.shader(theShader);
  theShader.setUniform('resolution', [p1.width, p1.height]);
  theShader.setUniform('time', p1.frameCount * 0.01);
  theShader.setUniform('fractal_type', fractal_type)
  theShader.setUniform('scale', scale)
  theShader.setUniform('transform_1', transform_1)
  theShader.setUniform('transform_2', transform_2)
  theShader.setUniform('ambient', ambient)
  theShader.setUniform('camera_amp', camera_amp)
  theShader.setUniform('camera_speed', camera_speed)
  p1.rect(0,0,p1.width, p1.height);
}

s1.init({src: p1.canvas})
s2.init({src: vid})


console.log(transform_1)
console.log(transform_2)
console.log(fractal_type)
console.log(fft)
console.log(vol)
console.log(Math.floor(Math.random() * vid.duration))

src(s1)
  .out()

console.log(Math.sin(vol**8))

osc(1,0.5,1)
	.add(o1, () => (Math.sin(time/4) * 0.3 + 0.1))
	//.repeat(5)
  	.scale(()=>Math.sin(time / 16)).rotate(0, -0.1)
	.out(o1)

src(o1)
  .rotate(0,0.1)
  .add(s1, 3)
  .out()

noise(10, 0.1)
  .add(s1, 5)
	.out(o0)

  osc(1,0.5,1)
    .add(o0, () => (Math.sin(time/4) * 0.3 + 0.1))
    .scale(()=>Math.sin(time / 16)).rotate(0, -0.1)
    .modulate(s2)
    .out(o0)

audio.play();

audio.pause();

p1.remove()

soundFile.dispose();
