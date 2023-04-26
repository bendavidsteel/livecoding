precision mediump float;
uniform float time;
uniform vec2 resolution;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec2 centre = vec2(0.5, 0.5);
    float from = distance(uv, centre);
    gl_FragColor = vec4(from);
}
