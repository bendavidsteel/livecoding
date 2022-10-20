// create an html5 video element
plant_vid = document.createElement('video')
plant_vid.autoplay = true
plant_vid.loop = true
// get path to video using getPaths() representing current directory in atom
plant_vid.src = atom.project.getPaths()[0]+'/assets/Time_Lapse_of_Ancient_Liverwort_Plant_Taking_Over_the_Planter-F9uVjCIgbQk.mp4'

goth_vid = document.createElement('video')
goth_vid.autoplay = true
goth_vid.loop = true
// get path to video using getPaths() representing current directory in atom
goth_vid.src = atom.project.getPaths()[0]+'/assets/Cybergoth_Dance_Party-gPbVRpRgHso.mp4'

// use video within hydra
s1.init({src: plant_vid})

s2.init({src: goth_vid})

noise(2, 0.1)
  .shift(0.1,0.9,0.3)
  .color(1,1.2,0.9)
  .modulate(s1, 0.2)
  .modulate(s2, 0.9)
  .
  .out()
