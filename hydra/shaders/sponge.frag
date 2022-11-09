/**
 * @file MengerSponge.glsl
 *
 * @brief This shader targets to achieve a mathematical render of Menger's Sponge, a generalization to higher
 * dimensions of Sierpinski's Carpet.
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

#define MaximumRaySteps 100
#define MaximumDistance 1000.
#define MinimumDistance .01
#define PI 3.141592653589793238

// we need the sketch resolution to perform some calculations
uniform vec2 resolution;
uniform float time;

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

// --------------------------------------------------------------------------------------------//
vec3 hsv2rgb (vec3 c) {
  vec4 K = vec4 (1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs (fract (c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix (K.xxx, clamp (p - K.xxx, 0.0, 1.0), c.y);
}

float map (float value, float min1, float max1, float min2, float max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

float sierpinski3 (vec3 z) {
  const int iterations = 25;
  float Scale = 2.0 + (sin (time / 2.0) + 1.0);
  vec3 Offset = 3.0 * vec3 (1.0, 1.0, 1.0);
  float bailout = 1000.0;

  float r;
  int final_n = iterations;
  for (int n = 0; n < int (iterations); n++) {

    z.x = abs (z.x);
    z.y = abs (z.y);
    z.z = abs (z.z);

    if (z.x - z.y < 0.0) z.xy = z.yx; // fold 1
    if (z.x - z.z < 0.0) z.xz = z.zx; // fold 2
    if (z.y - z.z < 0.0) z.zy = z.yz; // fold 3

    z.x = z.x * Scale - Offset.x * (Scale - 1.0);
    z.y = z.y * Scale - Offset.y * (Scale - 1.0);
    z.z = z.z * Scale;

    if (z.z > 0.5 * Offset.z * (Scale - 1.0)) {
      z.z -= Offset.z * (Scale - 1.0);
    }

    r = length (z);
    if (r >= bailout) {
      final_n = n + 1;
      break;
    }
  }

  return (length (z) - 2.0) * pow (Scale, -float (final_n));
}

// Calculates de distance from a position p to the scene
float DistanceEstimator (vec3 p) {
  p.yz *= Rotate (0.2 * PI);
  p.yx *= Rotate (0.3 * PI);
  p.xz *= Rotate (0.29 * PI);
  float sierpinski = sierpinski3 (p);
  return sierpinski;
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
  vec3 p = vec3 (0.0);

  for (float s = 0.0; s < float (MaximumRaySteps); s++) {
    p = ro + totalDistance * rd; // Current position of the ray
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

  if (minDistToScene > MinimumDistance) {

  }

  if (hit) {
    col.rgb = vec3 (0.8 + (length (curPos) / 8.0), 1.0, 0.8);
    col.rgb = hsv2rgb (col.rgb);

  }
  else {
    col.rgb = vec3 (0.8 + (length (minDistToScenePos) / 8.0), 1.0, 0.8);
    col.rgb = hsv2rgb (col.rgb);
    col.rgb *= 1.0 / pow (minDistToScene, 1.0);
    col.rgb /= 15.0 * map (sin (time * 3.0), -1.0, 1.0, 1.0, 3.0);
  }
  col.rgb /= iterations / 10.0; // Ambeint occlusion
  col.rgb /= pow (distance (ro, minDistToScenePos), 2.0);
  col.rgb *= 2000.0;

  return col;
}

void main () {
  // Normalized pixel coordinates (from 0 to 1)
  vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / resolution.y;
  uv *= 0.2;
  uv.y -= 0.015;

  vec3 ro = vec3 (-40, 30.1, -10); // Ray origin
  //ro.yz *= Rotate (-m.y * 2.0 * PI + PI - 1.1); // Rotate thew ray with the mouse rotation
  ro.xz *= Rotate (-time * 2.0 * PI / 20.0);
  vec3 rd = R (uv, ro, vec3 (0, 1, 0), 1.); // Ray direction (based on mouse rotation)

  vec4 col = RayMarcher (ro, rd);

  // Output to screen
  gl_FragColor = vec4 (col);
}