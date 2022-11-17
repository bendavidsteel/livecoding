vid_names = ['Cybergoth_Dance_Party-gPbVRpRgHso.mp4',
'Magnapinna_Squid_Filmed_at_Drilling_Site-GSXqqi3ShOs.webm',
'no_4mat_1992-BpZ2s1BrLHI_downsampled.mp4',
'North_Sea_Big_Wave-gPy2DHHnlqQ.webm',
'Sardine_Feeding_Frenzy_at_Monterey_Bay_Aquarium-8jrynE5EWAU.webm',
'Time_Lapse_of_Ancient_Liverwort_Plant_Taking_Over_the_Planter-F9uVjCIgbQk.mp4',
'VID_20220926_191153267_downsampled.mp4'];

// create an html5 video element
vid = document.createElement('video')
vid.autoplay = true
vid.loop = true
vid.muted = true

// get path to video using getPaths() representing current directory in atom
vid.src = atom.project.getPaths()[0]+'/assets/' + vid_names[Math.floor(Math.random() * vid_names.length)]

vid.src = atom.project.getPaths()[0]+'/assets/' + vid_names[1]

randomTime = Math.floor(Math.random() * vid.duration);
console.log(randomTime)
if (Number.isFinite(randomTime)) {
	vid.currentTime = randomTime;
}

// use video within hydra
s1.init({src: vid})

src(s1).out()

src(s1)
	.color(0.4,0.8,0.3).contrast(1.4)
	.add(src(o0).modulate(o0,.04),.6)
	.invert().brightness(0.1).contrast(1.2)
	.modulateScale(osc(2),-0.2)
  .out()

  osc(0.7,0.8,1)
    .color(0.8, 0.9, 0.3)
    .add(o0, () => (Math.sin(time/4) * 0.2 + fft[1]))
    .scale(()=>Math.sin(time / 16)).rotate(0, -0.1)
    .modulate(s1, 5)
    .out()
