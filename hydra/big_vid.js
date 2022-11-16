const Meyda = require('meyda')
p1 = new P5();

theShader = p1.loadShader(atom.project.getPaths()[0]+'/shaders/generic.vert', atom.project.getPaths()[0]+'/shaders/fractals.frag');

// shaders require WEBGL mode to work
p1.createCanvas(600, 300, p1.WEBGL);
p1.noStroke();

fractal_type = 0;
scale_amp = -1;
scale_period = 1;
transform_1 = 0;
transform_2 = 0;
ambient_amp = 0;
ambient_period = 1;
camera_amp = 1;
camera_speed = 1;

numBins = 4
cutoff = 2
smooth = 0.4
max = 15
vol = 0
bins = Array(numBins).fill(0)
prevBins = Array(numBins).fill(0)
fft = Array(numBins).fill(0)

vid = document.createElement('video')
vid.autoplay = true
vid.loop = true
// get path to video using getPaths() representing current directory in atom

vid_names = ['Cybergoth_Dance_Party-gPbVRpRgHso.mp4',
'Magnapinna_Squid_Filmed_at_Drilling_Site-GSXqqi3ShOs.webm',
'no_4mat_1992-BpZ2s1BrLHI_downsampled.mp4',
'North_Sea_Big_Wave-gPy2DHHnlqQ.webm',
'Sardine_Feeding_Frenzy_at_Monterey_Bay_Aquarium-8jrynE5EWAU.webm',
'Time_Lapse_of_Ancient_Liverwort_Plant_Taking_Over_the_Planter-F9uVjCIgbQk.mp4',
'VID_20220926_191153267_downsampled.mp4'];

scale = 3;
vid.src = atom.project.getPaths()[0]+'/assets/' + vid_names[0];

audio = document.createElement("audio");
audio.loop = true;
audio.src = atom.project.getPaths()[0]+'/assets/034.wav';

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
      vol = features.loudness.total
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
    }
  }
})
analyzer.start();


p1.draw = () => {
  p1.shader(theShader);
  theShader.setUniform('resolution', [p1.width, p1.height]);
  theShader.setUniform('time', p1.frameCount * 0.01);
  theShader.setUniform('fractal_type', fractal_type)
  theShader.setUniform('scale_amp', scale_amp)
  theShader.setUniform('scale_period', scale_period)
  theShader.setUniform('transform_1', transform_1)
  theShader.setUniform('transform_2', transform_2)
  theShader.setUniform('ambient_amp', ambient_amp)
  theShader.setUniform('ambient_period', ambient_period)
  theShader.setUniform('camera_amp', camera_amp)
  theShader.setUniform('camera_speed', camera_speed)
  p1.rect(0,0,p1.width, p1.height);
}


looper = () => {
  vid.src = atom.project.getPaths()[0]+'/assets/' + vid_names[Math.floor(Math.random() * vid_names.length)]
  vid.currentTime = Math.floor(Math.random() * vid.duration);
}

s1.init({src: p1.canvas})
s2.init({src: vid})

setInterval(looper, 1000)

console.log(fft)

osc(1, 0.5, 1)
	.add(o0, () => (Math.sin(time/4) * 0.7 + 0.1))
	//.repeat(5)
  	.scale(()=>Math.sin(time / 16)).rotate(0, -0.1)
	.out(o0)

audio.play();

audio.pause();

p1.remove()
soundFile.dispose();
