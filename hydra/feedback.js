
// set port to listen to osc messages. default port is 57101
msg.setPort(3333)
//


// function to convert tidal messages from an array to an object
// run this code once
parseTidal = (args) => {
  obj = {}
  for(var i = 0; i < args.length; i+=2){
    obj[args[i]] = args[i+1]
  }
  return obj
}

goth_vid = document.createElement('video')
goth_vid.autoplay = true
goth_vid.loop = true
// get path to video using getPaths() representing current directory in atom
goth_vid.src = atom.project.getPaths()[0]+'/assets/Cybergoth_Dance_Party-gPbVRpRgHso.mp4'


s2.init({src: goth_vid})

// receive messages from supercollider in hydra. '/play2' corresponds to the
// address of the OSC message, defined in the file tidal-forward.sc
// open the console to see the messages, using Ctrl+Alt+I (windows), Cmd+Opt+I (mac), or Ctrl + Shift + I(linux)
//
msg.on('/dirt/play', (args) => {
  // parse the values from tidal
 var tidal = parseTidal(args)
//
  setTimeout(() => {
    //
    // If the tidal sample is "sd", set blend to 0, if it is bd, set blend to 1
    //
     if(tidal.s === "808bd"){
       scale = 2
     } else if (tidal.s === "cp"){
      scale = 3
     } else if (tidal.s == "808sd") {
       scale = 7
     } else if (tidal.s == "808mt") {
       tom = 0.01
     } else if (tidal.s == "808lt") {
       tom = 0.2
     }
     //
  }, tidal.delta * 1000)
})

scale = 3
tom = 0.2

src(o0)
  .modulateHue(src(o0).scale(() => scale),1)
  .layer(osc(4,0.1,scale).mask(shape(() => scale,0.5,0.001).rotate(10, () => scale/20)))
  .luma(() => scale / 30,0.01)
  .modulate(voronoi(() => tom))
  .modulateScale(s2, 0.2)
  .hue(() => tom/2)
  .out(o0)
