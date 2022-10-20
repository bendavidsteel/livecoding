/**
 * @file Mandelbulb.glsl
 *
 * @brief This shader targets to achieve a mathematical render of Mandelbrot's Bulb, a fractal based on the same
 * Mandelbrots's Formula used to construct the well known Mandelbrot's set.
 *
 * @author Pedro Schneider <pedrotrschneider@gmail.com>
 *
 * @date 06/2020
 *
 * Direct link to ShaderToy: <not available yet>
*/

#ifdef GL_ES
precision mediump float;
#endif

#define MaximumRaySteps 250
#define MaximumDistance 200.
#define MinimumDistance .0001
#define PI 3.141592653589793238

// we need the sketch resolution to perform some calculations
uniform vec2 resolution;
uniform float time;
uniform float var1;
uniform float var2;

// TRANSFORM FUNCTIONS //

mat2 Rotate (float angle) {
  float s = sin (angle);
  float c = cos (angle);

  return mat2 (c, -s, s, c);
}

vec3 R (vec2 uv, vec3 p, vec3 l, float z) {
  vec3 f = normalize (l - p),
    r = normalize (cross (vec3 (0, 1, 0), f)),
    u = cross (f, r),
    c = p + f * z,
    i = c + uv.x * r + uv.y * u,
    d = normalize (i - p);
  return d;
}

vec3 hsv2rgb (vec3 c) {
  vec4 K = vec4 (1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs (fract (c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix (K.xxx, clamp (p - K.xxx, 0.0, 1.0), c.y);
}

float map (float value, float min1, float max1, float min2, float max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

float mandelbulb (vec3 position) {
  vec3 z = position;
  float dr = 1.0;
  float r = 0.0;
  int iterations = 0;
  float power = 8.0 + (5.0 * map (sin (time * PI / 10.0 + PI), -1.0, 1.0, 0.0, 1.0));

  for (int i = 0; i < 10; i++) {
    iterations = i;
    r = length (z);

    if (r > 2.0) {
      break;
    }

    // convert to polar coordinates
    float theta = acos (z.z / r);
    float phi = atan (z.y, z.x);
    dr = pow (r, power - 1.0) * power * dr + 1.0;

    // scale and rotate the point
    float zr = pow (r, power);
    theta = theta * power;
    phi = phi * power;

    // convert back to cartesian coordinates
    z = zr * vec3 (sin (theta) * cos (phi), sin (phi) * sin (theta), cos (theta));
    z += position;
  }
  float dst = 0.5 * log (r) * r / dr;
  return dst;
}

// Calculates de distance from a position p to the scene
float MandelDistanceEstimator (vec3 p) {
  p.yz *= Rotate (-0.3 * PI);
  float mandelbulb = mandelbulb (p);
  return mandelbulb;
}

// Marches the ray in the scene
vec4 RayMarcher (vec3 ro, vec3 rd) {
  float steps = float (MaximumRaySteps) - 1.0;
  float totalDistance = 0.0;
  float minDistToScene = 100.0;
  vec3 minDistToScenePos = ro;
  float minDistToOrigin = 100.0;
  vec3 minDistToOriginPos = ro;
  vec4 col = vec4 (0.0, 0.0, 0.0, 1.0);
  vec3 curPos = ro;
  bool hit = false;

  for (float s = 0.0; s < float (MaximumRaySteps); s++) {
    vec3 p = ro + totalDistance * rd; // Current position of the ray
    float distance = DistanceEstimator (p); // Distance from the current position to the scene
    curPos = ro + rd * totalDistance;
    if (minDistToScene > distance) {
      minDistToScene = distance;
      minDistToScenePos = curPos;
    }
    if (minDistToOrigin > length (curPos)) {
      minDistToOrigin = length (curPos);
      minDistToOriginPos = curPos;
    }
    totalDistance += distance; // Increases the total distance armched
    if (distance < MinimumDistance) {
      hit = true;
      steps = s;
      break; // If the ray marched more than the max steps or the max distance, breake out
    }
    else if (distance > MaximumDistance) {
      steps = s;
      break;
    }
  }

  float iterations = float (steps) + log (log (MaximumDistance)) / log (2.0) - log (log (dot (curPos, curPos))) / log (2.0);

  if (hit) {
    col.rgb = vec3 (0.8 + (length (curPos) / 0.5), 1.0, 0.8);
    col.rgb = hsv2rgb (col.rgb);
  }
  else {
    col.rgb = vec3 (0.8 + (length (minDistToScenePos) / 0.5), 1.0, 0.8);
    col.rgb = hsv2rgb (col.rgb);
    col.rgb *= 1.0 / (minDistToScene * minDistToScene);
    col.rgb /= map (sin (time * 3.0), -1.0, 1.0, 3000.0, 50000.0);
  }

  col.rgb /= steps * 0.08; // Ambeint occlusion
  col.rgb /= pow (distance (ro, minDistToScenePos), 2.0);
  col.rgb *= 3.0;

  return col;
}

void main () {
  // Normalized pixel coordinates (from 0 to 1)
  vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / resolution.y;
  uv *= 1.5;

  vec3 ro = vec3 (0, 0, -2.0); // Ray origin
  // ro.yz *= Rotate (var1 * PI + 1.5); // Rotate thew ray with the mouse rotation
  // ro.xz *= Rotate (time * 2.0 * PI / 10.0);
  ro.z = (sin (time * 2.0 * PI / 40.0) / 4.0) + 1.75;
  ro.y = sin (time * 2.0 * PI / 40.0) / 4.0;
  vec3 rd = R (uv, ro, vec3 (0, 0, 1), 1.); // Ray direction (based on mouse rotation)
  //vec3 rd = normalize (vec3 (-1.0 + 2.0 * uv, 1.0));

  vec4 col = RayMarcher (ro, rd);

  // Output to screen
  gl_FragColor = vec4 (col);
}
