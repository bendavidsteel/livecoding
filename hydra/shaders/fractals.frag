#ifdef GL_ES
precision mediump float;
#endif

#define MaximumRaySteps 2500
#define PI 3.141592653589793238

#define TET 0
#define SPONGE 1
#define BULB 2
#define BOX 3

uniform vec2 resolution;
uniform float time;
uniform int fractal_type;
uniform float scale_amp;
uniform float scale_period;
uniform float transform_1;
uniform float transform_2;
uniform float ambient_amp;
uniform float ambient_period;
uniform float camera_amp;
uniform float camera_speed;

const mat2 identity2 = mat2 (1., 0., 0., 1.);

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

    z.yz *= (1. - transform_1) * identity2 + transform_1 * Rotate ((time / 2.0) / 2.0);
    z.xz *= (1. - transform_1) * identity2 + transform_1 * Rotate (sin (time / 2.0) / 5.0);
    z.yx *= (1. - transform_2) * identity2 + transform_2 * Rotate ((0.436332 + sin(time * 0.9) * 0.1 + 4.9));

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

    z.yx *= (1. - transform_1) * identity2 + transform_1 * Rotate (sin (time / 5.0));

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

float DE0 (vec3 pos) {
  vec3 from = vec3 (0.0);
  vec3 z = pos - from;
  float r = dot (pos - from, pos - from) * pow (length (z), 2.0);
  return (1.0 - smoothstep (0.0, 0.01, r)) * 0.01;
}

float DE2 (vec3 pos) {
  // vec3 params = vec3 (0.22, 0.5, 0.5);
  vec3 params = vec3 (0.5, 0.5, 0.5);
  vec4 scale = vec4 (-20.0 * 0.272321);
  vec4 p = vec4 (pos, 1.0), p0 = p;
  vec4 c = vec4 (params, 0.5) - 0.5; // param = 0..1

  for (float i = 0.0; i < 10.0; i++) {
    p.yz *= (1. - transform_1) * identity2 + transform_1 * Rotate ((time / 2.0) / 2.0);
    p.xz *= (1. - transform_1) * identity2 + transform_1 * Rotate (sin (time / 2.0) / 5.0);
    p.yx *= (1. - transform_2) * identity2 + transform_2 * Rotate ((0.436332 + sin(time * 0.9) * 0.1 + 4.9));

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


float sierpinski3 (vec3 z) {
  const int iterations = 25;
  float Scale = 2.0 + ((scale_amp * cos (scale_period * time / 2.0)) + 1.0);
  vec3 Offset = (1. - transform_2) * 3.0 * vec3 (1.0, 1.0, 1.0) + transform_2 * vec3 (2., 4.8, 0.);
  float bailout = 1000.0;

  float r = length (z);
  int final_n = iterations;
  for (int n = 0; n < iterations; n++) {

    if (fractal_type == TET) {
      z.yx *= (1. - transform_1) * identity2 + transform_1 * Rotate (sin (time / 5.0));

      if (z.x + z.y < 0.0) z.xy = -z.yx; // fold 1
      if (z.x + z.z < 0.0) z.xz = -z.zx; // fold 2
      if (z.y + z.z < 0.0) z.zy = -z.yz; // fold 3

      z.yz *= (1. - transform_1) * identity2 + transform_1 * Rotate ((time / 2.0) / 2.0);
      z.xz *= (1. - transform_1) * identity2 + transform_1 * Rotate (sin (time / 2.0) / 5.0);
      z.yx *= (1. - transform_2) * identity2 + transform_2 * Rotate ((0.436332 + sin(time * 0.9) * 0.1 + 4.9));

      z = z * Scale - Offset * (Scale - 1.0);
    } else {
      z.yx *= (1. - transform_1) * identity2 + transform_1 * Rotate (sin (time / 5.0));

      z.x = abs (z.x);
      z.y = abs (z.y);
      z.z = abs (z.z);

      if (z.x - z.y < 0.0) z.xy = z.yx; // fold 1
      if (z.x - z.z < 0.0) z.xz = z.zx; // fold 2
      if (z.y - z.z < 0.0) z.zy = z.yz; // fold 3

      z.yz *= (1. - transform_1) * identity2 + transform_1 * Rotate ((time / 2.0) / 2.0);
      z.xz *= (1. - transform_1) * identity2 + transform_1 * Rotate (sin (time / 2.0) / 5.0);
      z.yx *= (1. - transform_2) * identity2 + transform_2 * Rotate ((0.436332 + sin(time * 0.9) * 0.1 + 4.9));

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
  }

  float norm_offset = 2.0;
  if (fractal_type == TET) {
    norm_offset = 0.0;
  }

  return (length (z) - norm_offset) * pow (Scale, -float (final_n));
}

float SierpinskiDistanceEstimator (vec3 p) {
  if (fractal_type == TET) {
    p.yz *= Rotate (0.20 * PI);
    p.yx *= Rotate (0.25 * PI);
  } else {
    p.yz *= Rotate (0.2 * PI);
    p.yx *= Rotate (0.3 * PI);
    p.xz *= Rotate (0.29 * PI);
  }
  float sierpinski = sierpinski3 (p);
  return sierpinski;
}


// Marches the ray in the scene
vec4 RayMarcher (vec3 ro, vec3 rd) {

  int maximumRaySteps;
  if (fractal_type <= SPONGE) {
    maximumRaySteps = 100;
  } else if (fractal_type == BULB) {
    maximumRaySteps = 250;
  } else if (fractal_type == BOX) {
    maximumRaySteps = 2500;
  }

  float maximumDistance;
  if (fractal_type <= SPONGE) {
    maximumDistance = 1000.;
  } else if (fractal_type >= BULB) {
    maximumDistance = 200.;
  }

  float minimumDistance;
  if (fractal_type <= SPONGE) {
    minimumDistance = 0.01;
  } else if (fractal_type == BULB) {
    minimumDistance = 0.0001;
  } else if (fractal_type == BOX) {
    minimumDistance = 0.001;
  }

  float steps = float (maximumRaySteps) - 1.0;
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
      break;
    }

    vec3 p = ro + totalDistance * rd; // Current position of the ray

    float distance = minDistToScene;
    if (fractal_type <= SPONGE) {
      distance = SierpinskiDistanceEstimator (p); // Distance from the current position to the scene
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

  if (fractal_type <= SPONGE) {
    if (hit) {
      col.rgb = vec3 (0.8 + (length (curPos) / 8.0), 1.0, 0.8);
      col.rgb = hsv2rgb (col.rgb);

    }
    else {
      col.rgb = vec3 (0.8 + (length (minDistToScenePos) / 8.0), 1.0, 0.8);
      col.rgb = hsv2rgb (col.rgb);
      col.rgb *= 1.0 / pow (minDistToScene, 1.0);
      col.rgb /= 15.0 * map (cos (time * ambient_period * 3.0), -1.0, 1.0, 1.0, ambient_amp * 3.0);
    }
    col.rgb /= iterations / 10.0; // Ambeint occlusion
    col.rgb /= pow (distance (ro, minDistToScenePos), 2.0);
    col.rgb *= 2000.0;
  } else if (fractal_type == BULB) {
    if (hit) {
      col.rgb = vec3 (0.8 + (length (curPos) / 0.5), 1.0, 0.8);
      col.rgb = hsv2rgb (col.rgb);
    }
    else {
      col.rgb = vec3 (0.8 + (length (minDistToScenePos) / 0.5), 1.0, 0.8);
      col.rgb = hsv2rgb (col.rgb);
      col.rgb *= 1.0 / (minDistToScene * minDistToScene);
      col.rgb /= map (cos (time * ambient_period * 3.0), -1.0, 1.0, 3000.0, ambient_amp * 50000.0);
    }

    col.rgb /= steps * 0.08; // Ambeint occlusion
    col.rgb /= pow (distance (ro, minDistToScenePos), 2.0);
    col.rgb *= 3.0;
  } else if (fractal_type == BOX) {
    if (hit) {
      col.rgb = vec3 (0.8 + (length (curPos) / 10.0), 1.0, 0.8);
      col.rgb = hsv2rgb (col.rgb);
    }

    col.rgb /= steps * 0.08; // Ambeint occlusion
    col.rgb /= pow (distance (ro, minDistToScenePos), 2.0);
    col.rgb *= 20.0;
  }

  return col;
}

void main () {
  // Normalized pixel coordinates (from 0 to 1)
  vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / resolution.y;
  if (fractal_type <= SPONGE) {
    uv *= 0.2;
  } else if (fractal_type == BULB) {
    uv *= 1.5;
  }

  if (fractal_type == SPONGE) {
    uv.y -= 0.015;
  }

  // Ray origin
  vec3 ro;
  if (fractal_type <= SPONGE) {
    ro = vec3 (-40, 30.1, -10);
    ro.yz *= Rotate (-0.5 * 2.0 * PI + PI - 1.1); // Rotate thew ray with the mouse rotation
    ro.xz *= Rotate (camera_speed * -time * 2.0 * PI / 10.0);
  } else if (fractal_type >= BULB) {
    ro = vec3 (0, 0, -2.0);
    if (fractal_type == BULB) {
      ro.z = (camera_amp * cos (camera_speed * time * 2.0 * PI / 40.0) / 4.0) + 1.75;
      ro.y = camera_amp * cos (camera_speed * time * 2.0 * PI / 40.0) / 4.0;
    } else if (fractal_type == BOX) {
      ro.yz *= Rotate ((camera_speed * time * PI + 1.0) / 20.0); // Rotate thew ray with the mouse rotation
      ro.xz *= Rotate (camera_speed * time * 2.0 * PI / 10.0);
    }
  }
  // ro.yz *= Rotate (var1 * PI + 1.5); // Rotate thew ray with the mouse rotation
  // ro.xz *= Rotate (time * 2.0 * PI / 10.0);

  vec3 rdo;
  if (fractal_type <= SPONGE) {
    rdo = vec3 (0, 1, 0);
  } else if (fractal_type >= BULB) {
    rdo = vec3 (0, 0, 1);
  }
  vec3 rd = R (uv, ro, rdo, 1.); // Ray direction (based on mouse rotation)
  //vec3 rd = normalize (vec3 (-1.0 + 2.0 * uv, 1.0));

  vec4 col = RayMarcher (ro, rd);

  // Output to screen
  gl_FragColor = vec4 (col);
}
