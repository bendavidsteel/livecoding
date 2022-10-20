//this variable will hold our shader object

p1 = new P5()

theShader = p1.loadShader(atom.project.getPaths()[0]+'/shaders/generic.vert', atom.project.getPaths()[0]+'/shaders/tetra.frag');

// shaders require WEBGL mode to work
p1.createCanvas(600, 300, p1.WEBGL);
p1.noStroke();

p1.draw = () => {
  p1.shader(theShader);
  theShader.setUniform('resolution', [p1.width, p1.height]);
  theShader.setUniform('var1', p1.map(p1.mouseX, 0, p1.width, 0, 0.2));
  theShader.setUniform('time', p1.frameCount * 0.01);
  theShader.setUniform('fractal_type', 3)
  p1.rect(0,0,p1.width, p1.height);
}

p1.remove()

s0.init({src: p1.canvas})

src(s0).out()
