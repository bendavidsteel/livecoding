//this variable will hold our shader object

p1 = new P5()

theShader = p1.loadShader(atom.project.getPaths()[0]+'/shaders/generic.vert', atom.project.getPaths()[0]+'/shaders/fractals.frag');

// shaders require WEBGL mode to work
p1.createCanvas(600, 300, p1.WEBGL);
p1.noStroke();

camera_amp = 1;
camera_speed = 10;

p1.draw = () => {
  p1.shader(theShader);
  theShader.setUniform('resolution', [p1.width, p1.height]);
  theShader.setUniform('var1', p1.map(p1.mouseX, 0, p1.width, 0, 0.2));
  theShader.setUniform('time', p1.frameCount * 0.01);
  theShader.setUniform('fractal_type', 2)
  theShader.setUniform('scale', -1)
  theShader.setUniform('ambient', -1)
  theShader.setUniform('camera_amp', camera_amp)
  theShader.setUniform('camera_speed', camera_speed)
  theShader.setUniform('transform_1', 0.2)
  theShader.setUniform('transform_2', 0.5)
  p1.rect(0,0,p1.width, p1.height);
}

p1.remove()

s0.init({src: p1.canvas})

src(s0)
  .color(1,0,3)
  .out()
