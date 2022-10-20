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

#define MaximumRaySteps 2500
#define PI 3.141592653589793238

#define TET 0
#define SPONGE 1
#define BROCOLLI 2
#define MUSHROOM 3
#define BULB 4
#define BOX 5

// we need the sketch resolution to perform some calculations
uniform vec2 resolution;
uniform float time;
uniform float var1;
uniform float var2;
uniform int fractal_type;

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
float BulbDistanceEstimator (vec3 p) {
  p.yz *= Rotate (-0.3 * PI);
  float mandelbulb = mandelbulb (p);
  return mandelbulb;
}

// SDF FUNCTIONS //
// SDF sphere
vec4 sphere (vec4 z) {
  float r2 = dot (z.xyz, z.xyz);
  if (r2 < 2.0)
    z *= (1.0 / r2);
  else z *= 0.5;

  return z;
}

// SDF box
vec3 box (vec3 z) {
  return clamp (z, -1.0, 1.0) * 2.0 - z;
}

// Sphere
// s: radius
float SignedDistSphere (vec3 p, float s) {
  return length (p) - s;
}

// Box
// b: size of box in x/y/z
float SignedDistBox (vec3 p, vec3 b) {
  vec3 d = abs (p) - b;
  return min (max (d.x, max (d.y, d.z)), 0.0) + length (max (d, 0.0));
}

// (Infinite) Plane
// n.xyz: normal of the plane (normalized)
// n.w: offset from origin
float SignedDistPlane (vec3 p, vec4 n) {
  return dot (p, n.xyz) + n.w;
}

// Rounded box
// r: radius of the rounded edges
float SignedDistRoundBox (in vec3 p, in vec3 b, in float r) {
  vec3 q = abs (p) - b;
  return min (max (q.x, max (q.y, q.z)), 0.0) + length (max (q, 0.0)) - r;
}

// BOOLEAN OPERATORS //

// Union
// d1: signed distance to shape 1
// d2: signed distance to shape 2
float opU (float d1, float d2) {
  return (d1 < d2) ? d1 : d2;
}

// Subtraction
// d1: signed distance to shape 1
// d2: signed distance to shape 2
vec4 opS (vec4 d1, vec4 d2) {
  return (-d1.w > d2.w) ? -d1 : d2;
}

// Intersection
// d1: signed distance to shape 1
// d2: signed distance to shape 2
vec4 opI (vec4 d1, vec4 d2) {
  return (d1.w > d2.w) ? d1 : d2;
}

// Mod Position Axis
float pMod1 (inout float p, float size) {
  float halfsize = size * 0.5;
  float c = floor ((p + halfsize) / size);
  p = mod (p + halfsize, size) - halfsize;
  p = mod (-p + halfsize, size) - halfsize;
  return c;
}

// SMOOTH BOOLEAN OPERATORS //

// Smooth Union
// d1: signed distance to shape 1
// d2: signed distance to shape 2
// k: smoothness value for the trasition
float opUS (float d1, float d2, float k) {
  float h = clamp (0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  float dist = mix (d2, d1, h) - k * h * (1.0 - h);

  return dist;
}

// Smooth Subtraction
// d1: signed distance to shape 1
// d2: signed distance to shape 2
// k: smoothness value for the trasition
vec4 opSS (vec4 d1, vec4 d2, float k) {
  float h = clamp (0.5 - 0.5 * (d2.w + d1.w) / k, 0.0, 1.0);
  float dist = mix (d2.w, -d1.w, h) + k * h * (1.0 - h);
  vec3 color = mix (d2.rgb, d1.rgb, h);

  return vec4 (color.rgb, dist);
}

// Smooth Intersection
// d1: signed distance to shape 1
// d2: signed distance to shape 2
// k: smoothness value for the trasition
vec4 opIS (vec4 d1, vec4 d2, float k) {
  float h = clamp (0.5 - 0.5 * (d2.w - d1.w) / k, 0.0, 1.0);
  float dist = mix (d2.w, d1.w, h) + k * h * (1.0 - h);
  vec3 color = mix (d2.rgb, d1.rgb, h);

  return vec4 (color.rgb, dist);
}

float DE0 (vec3 pos) {
  vec2 varpos;
  varpos.x = var1;
  varpos.y = var2;
  vec2 m = varpos.xy / resolution.xy;
  vec3 from = vec3 (0.0);
  vec3 z = pos - from;
  float r = dot (pos - from, pos - from) * pow (length (z), 2.0);
  return (1.0 - smoothstep (0.0, 0.01, r)) * 0.01;
}

float DE2 (vec3 pos) {
  vec2 varpos;
  varpos.x = var1;
  varpos.y = var2;
  vec2 m = varpos.xy / resolution.xy;
  // vec3 params = vec3 (0.22, 0.5, 0.5);
  vec3 params = vec3 (0.5, 0.5, 0.5);
  vec4 scale = vec4 (-20.0 * 0.272321);
  vec4 p = vec4 (pos, 1.0), p0 = p;
  vec4 c = vec4 (params, 0.5) - 0.5; // param = 0..1

  for (float i = 0.0; i < 10.0; i++) {
    p.xyz = box (p.xyz);
    p = sphere (p);
    p = p * scale + c;
  }

  return length (p.xyz) / p.w;
}

float BoxDistanceEstimator (vec3 pos) {
  float d0 = DE0 (pos);
  float d2 = DE2 (pos);
  return max (d0, d2);
}

float Sierpinski3 (out vec3 z) {
  const int iterations = 25;
  float Scale = 2.0 + (sin (time / 2.0) + 1.0);
  vec3 Offset = 3.0 * vec3 (1.0, 1.0, 1.0);
  if (fractal_type == BROCOLLI) {
    Offset = vec3 (2.0, 4.8, 0.0);
  }
  float bailout = 1000.0;

  float r = length (z);
  int final_n = iterations - 1;
  for (int n = 0; n < iterations; n++) {

    if (fractal_type == TET) {
      if (z.x + z.y < 0.0) z.xy = -z.yx; // fold 1
      if (z.x + z.z < 0.0) z.xz = -z.zx; // fold 2
      if (z.y + z.z < 0.0) z.zy = -z.yz; // fold 3
      z = z * Scale - Offset * (Scale - 1.0);
    } else {
      if (fractal_type == MUSHROOM) {
        z.yx *= Rotate (sin (time / 5.0));
      }

      z.x = abs (z.x);
      z.y = abs (z.y);
      z.z = abs (z.z);

      if (z.x - z.y < 0.0) z.xy = z.yx; // fold 1
      if (z.x - z.z < 0.0) z.xz = z.zx; // fold 2
      if (z.y - z.z < 0.0) z.zy = z.yz; // fold 3

      if (fractal_type == MUSHROOM) {
        z.yz *= Rotate (sin (time / 2.0) / 2.0);
        //z.yx *= Rotate (sin (iTime / 2.0) / 5.0);
        //z.yx *= Rotate(-map(mouse.x, -1.0, 1.0, 0.0, 2.0));
        //z.xz *= Rotate (0.4336332 + 0.02 * iTime);
        //z.yx *= Rotate (PI / 10.0);
        z.xz *= Rotate (sin (time / 2.0) / 5.0);
      } else if (fractal_type == BROCOLLI) {
        z.yx *= Rotate (0.436332 + sin(time * 0.9) * 0.1 + 4.9);
      }

      z.x = z.x * Scale - Offset.x * (Scale - 1.0);
      z.y = z.y * Scale - Offset.y * (Scale - 1.0);
      z.z = z.z * Scale;

      if (z.z > 0.5 * Offset.z * (Scale - 1.0)) {
        z.z -= Offset.z * (Scale - 1.0);
      }
    }

    r = length (z);
    if (r < bailout) {
      final_n = n;
      break;
    }
  }

  float norm_offset = 2.0;
  if (fractal_type == TET) {
    norm_offset = 0.0;
  }

  return (length (z) - norm_offset) * pow (Scale, -float (final_n));
}

float BrocolliDistanceEstimator (out vec3 p) {
  p.yz *= Rotate (0.2 * PI);
  p.yx *= Rotate (0.3 * PI);
  p.xz *= Rotate (0.29 * PI);
  float sierpinski = Sierpinski3 (p);
  return sierpinski;
}

float MushroomDistanceEstimator (out vec3 p) {
  p.yz *= Rotate (0.2 * PI);
  p.yx *= Rotate (0.3 * PI);
  p.xz *= Rotate (0.29 * PI);
  float sierpinski = Sierpinski3 (p);
  return sierpinski;
}

float SpongeDistanceEstimator (out vec3 p) {
  p.yz *= Rotate (0.2 * PI);
  p.yx *= Rotate (0.3 * PI);
  p.xz *= Rotate (0.29 * PI);
  float sierpinski = Sierpinski3 (p);
  return sierpinski;
}

float TetDistanceEstimator (out vec3 p) {
  p.yz *= Rotate (0.20 * PI);
  p.yx *= Rotate (0.25 * PI);
  float sierpinski = Sierpinski3 (p);
  return sierpinski;
}

// Marches the ray in the scene
vec4 RayMarcher (vec3 ro, vec3 rd) {

  int maximumRaySteps;
  if (fractal_type <= 3) {
    maximumRaySteps = 100;
  } else if (fractal_type == 4) {
    maximumRaySteps = 250;
  } else if (fractal_type == 5) {
    maximumRaySteps = 2500;
  }

  float maximumDistance;
  if (fractal_type <= 3) {
    maximumDistance = 1000.;
  } else if (fractal_type >= 4) {
    maximumDistance = 200.;
  }

  float minimumDistance;
  if (fractal_type <= 3) {
    minimumDistance = 0.01;
  } else if (fractal_type == 4) {
    minimumDistance = 0.0001;
  } else if (fractal_type == 5) {
    minimumDistance = 0.001;
  }

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
    if (s >= float (maximumRaySteps)) {
      steps = s;
      break;
    }

    vec3 p = ro + totalDistance * rd; // Current position of the ray

    float distance = minDistToScene;
    if (fractal_type == TET) {
      distance = TetDistanceEstimator (p); // Distance from the current position to the scene
    } else if (fractal_type == SPONGE) {
      distance = SpongeDistanceEstimator(p);
    } else if (fractal_type == BROCOLLI) {
      distance = BrocolliDistanceEstimator(p);
    } else if (fractal_type == MUSHROOM) {
      distance = MushroomDistanceEstimator(p);
    } else if (fractal_type == BULB) {
      distance = BulbDistanceEstimator(p);
    } else if (fractal_type == BOX) {
      distance = BoxDistanceEstimator(p);
    }

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
    if (distance < minimumDistance) {
      hit = true;
      steps = s;
      break; // If the ray marched more than the max steps or the max distance, breake out
    }
    else if (distance > maximumDistance) {
      steps = s;
      break;
    }
  }

  float iterations = float (steps) + log (log (maximumDistance)) / log (2.0) - log (log (dot (curPos, curPos))) / log (2.0);

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
  vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / resolution.y;;
  if (fractal_type <= 3) {
    uv *= 0.2;
  } else if (fractal_type == 4) {
    uv *= 1.5;
  }

  // Ray origin
  vec3 ro;
  if (fractal_type <= 3) {
    ro = vec3 (-40, 30.1, -10);
  } else if (fractal_type >= 4) {
    ro = vec3 (0, 0, -2.0);
    ro.z = (sin (time * 2.0 * PI / 40.0) / 4.0) + 1.75;
    ro.y = sin (time * 2.0 * PI / 40.0) / 4.0;
  }
  // ro.yz *= Rotate (var1 * PI + 1.5); // Rotate thew ray with the mouse rotation
  // ro.xz *= Rotate (time * 2.0 * PI / 10.0);

  vec3 rdo;
  if (fractal_type <= 3) {
    rdo = vec3 (0, 1, 0);
  } else if (fractal_type >= 4) {
    rdo = vec3 (0, 0, 1);
  }
  vec3 rd = R (uv, ro, rdo, 1.); // Ray direction (based on mouse rotation)
  //vec3 rd = normalize (vec3 (-1.0 + 2.0 * uv, 1.0));

  vec4 col = RayMarcher (ro, rd);

  // Output to screen
  gl_FragColor = vec4 (col);
}
