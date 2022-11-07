precision highp float;

const float PI = 3.1415926536;
const float DEG2RAD = PI/180.0;
const float SQRT3 = 1.7320508;

uniform int fractal_type;
uniform int lighting_type;

#define JULIABULB 0
#define MANDELBOX 1
#define MANDELBULB 2
#define MENGER_SPONGE 3
#define SIERPINSKI_DODECAHEDRON 4
#define SIERPINSKI_ICOSAHEDRON 5
#define SIERPINSKI_OCTAHEDRON 6
#define SIERPINSKI_TETRAHEDRON 7

#define ESCAPE_TIME 0
#define LAMBERT_SHADOW 1
#define LAMBERT 2
#define PATH_TRACING 3

uniform vec2 screenRes;
uniform vec2 randSeed;

uniform vec3 cameraPos;
uniform vec3 cameraDir;
uniform vec3 cameraRight;
uniform float cameraSpeed;

const float CAMERA_BOKEH = 0.0;         // default: 0.0, min: 0.0, max: 1.0
const float CAMERA_FOCUS = 3.0;         // default: 3.0, min: 0.0, max: 10.0
const float CAMERA_TILT = 0.0;          // default: 0.0, min: -180.0, max: 180.0
const float CAMERA_ZOOM = 1.5;          // default: 1.5, min: 0.0, max: 20.0

const float COLOR_HUE_SCALE = 1.0;      // default: 1.0, min: -5.0, max: 5.0
const float COLOR_HUE_OFFSET = 0.0;     // default: 0.0, min: 0.0, max: 1.0
const float COLOR_SATURATION = 0.6;     // default: 0.6, min: 0.0, max: 3.0
const float COLOR_VALUE = 0.7;          // default: 0.7, min: 0.0, max: 5.0

uniform sampler2D frameBuffer;
uniform float framesCount;

varying vec2 texCoords;

vec2 randCoord;

float rand()
{
	float x = fract(sin(dot(randCoord, vec2(182.8497, -2154.9248))) * 38223.19);
	randCoord += vec2(x);
	return x;
}
vec3 randHemisphere(vec3 normal)
{
	float b = rand()*PI*2.0;
	float c = acos(1.0-rand()*2.0);
	float x = sin(b)*sin(c);
	float y = sin(c);
	float z = sin(b)*cos(c);
	vec3 v = vec3(sin(b)*sin(c), cos(c), cos(b)*sin(c));
	return dot(v, normal) < 0.0 ? -v : v;
}
vec2 randDisk()
{
	float a = rand()*PI*2.0;
	float r = sqrt(rand());
	return vec2(cos(a), sin(a)) * r;
}
vec2 randHexagon()
{
	vec2 v1 = vec2(1.0, 0.0), v2 = vec2(-0.5, SQRT3*0.5);
	vec2 v = v1*rand() + v2*rand();  // random point on a rhombus, 1/3 of a hexagon
	float a = rand()*3.0;
	if (a < 1.0) {
		v = mat2(-0.5, -SQRT3*0.5, SQRT3*0.5, -0.5) * v;  // rotate 120 degrees
	} else if (a < 2.0) {
		v = mat2(-0.5, SQRT3*0.5, -SQRT3*0.5, -0.5) * v;  // rotate 240 degrees
	}
	return v;
}

vec2 rotate2(vec2 p, float a)
{
	a = a * DEG2RAD;
	float c = cos(a), s = sin(a);
	return mat2(c, -s, s, c) * p;
}
vec3 hsv2rgb(float x, float y, float z)
{
	vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
	vec3 p = abs(fract(vec3(x) + K.xyz) * 6.0 - K.www);
	return z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), y);
}
vec3 hsv2rgb(vec3 c)
{
	return hsv2rgb(c.x, c.y, c.z);
}

vec3 repeat(vec3 p, vec3 s)
{
	return mod(p + s/2.0, s) - s/2.0;
}

vec3 translate(vec3 p, vec3 t)
{
	return p - t;
}

vec3 rotateX(vec3 p, float a)
{
	a = -a * DEG2RAD;
	float c = cos(a), s = sin(a);
	return mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c) * p;
}
vec3 rotateY(vec3 p, float a)
{
	a = -a * DEG2RAD;
	float c = cos(a), s = sin(a);
	return mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c) * p;
}
vec3 rotateZ(vec3 p, float a)
{
	a = -a * DEG2RAD;
	float c = cos(a), s = sin(a);
	return mat3(c, -s, 0.0, s, c, 0.0, 0.0, 0.0, 1.0) * p;
}

float sphere(vec3 p, float r)
{
	return length(p) - r;
}

struct Distance
{
	float value;
	vec3 color;
	float emission;
};

Distance Color(float value, vec3 color)
{
	return Distance(value, color, 0.0);
}
Distance Light(float value, vec3 color)
{
	return Distance(value, color, 1.0);
}

Distance Union(Distance a, Distance b)
{
	if (a.value < b.value)
		return a;
	else
		return b;
}
Distance Intersection(Distance a, Distance b)
{
	if (a.value > b.value)
		return a;
	else
		return b;
}
Distance Complement(Distance a)
{
	return Distance(-a.value, a.color, a.emission);
}
Distance Difference(Distance a, Distance b)
{
	return Intersection(a, Complement(b));
}

// scenes

Distance JuliabulbScene(vec3 p)
{
  const int NUM_ITERATIONS = 12;         // default: 12, min: 0, max: 30

  const float C_X = 0.3;                  // default: 0.3, min: -5.0, max: 5.0
  const float C_Y = -0.9;                  // default: -0.9, min: -5.0, max: 5.0
  const float C_Z = -0.2;                  // default: -0.2, min: -5.0, max: 5.0
  const float EXPONENT = 3.0;             // default: 3.0, min: 1.0, max: 16.0

	vec3 z = p;
	vec3 d = vec3(1.0);
	float r = 0.0;
	float b = 10000.0;

	for (int i = 0; i < 30; ++i) {
		if (i == NUM_ITERATIONS) {
			break;
		}
		d = EXPONENT * pow(r, EXPONENT-1.0) * d + 1.0;
		if (r > 0.0) {
			float phi = atan(z.z, z.x);
			phi *= EXPONENT;
			float theta = acos(z.y/r);
			theta *= EXPONENT;
			r = pow(r, EXPONENT);
			z = vec3(cos(phi) * cos(theta), sin(theta), sin(phi) * cos(theta)) * r;
		}
		z += vec3(C_X, C_Y, C_Z);

		r = length(z);
		b = min(r, b);
		if (r >= 2.0) {
			break;
		}
	}
	return Color(r * log(r) * 0.5 / length(d), hsv2rgb(vec3(b*COLOR_HUE_SCALE+COLOR_HUE_OFFSET, COLOR_SATURATION, COLOR_VALUE*1.3)));
}

Distance MandelboxScene(vec3 p)
{
  const int NUM_ITERATIONS = 15;         // default: 15, min: 0, max: 30

  const float SCALE = 2.0;                // default: 2.0, min: -5.0, max: 5.0
  const float R1 = 0.5;                   // default: 0.5, min: 0.0, max: 5.0
  const float R2 = 1.0;                   // default: 1.0, min: 0.0, max: 5.0
  const float F = 1.2;                    // default: 1.2, min: -5.0, max: 5.0

	vec3 z = vec3(0.0);
	float d = 1.0;
	float r = 0.0;
	float b = 10000.0;

	for (int i = 0; i < 30; ++i) {
		if (i == NUM_ITERATIONS) {
			break;
		}
		z = clamp(z, -1.0, 1.0) * 2.0 - z;
		z *= F;

		r = length(z);
		if (r < R1) {
			float w = R2/R1;
			w *= w;
			z *= w;
			d *= w;
		} else if (r < R2) {
			float w = R2/r;
			w *= w;
			z *= w;
			d *= w;
		}
		z = z * SCALE + p;
		d = d * abs(SCALE) + 1.0;

		r = length(z);
		b = min(r, b);
		if (r >= 10.0) {
			break;
		}
	}
	return Color(r / d, hsv2rgb(b/5.0*COLOR_HUE_SCALE+COLOR_HUE_OFFSET, COLOR_SATURATION, COLOR_VALUE));
}

Distance MandelbulbScene(vec3 p)
{
  const int NUM_ITERATIONS = 8;         // default: 8, min: 0, max: 30
  const float EXPONENT = 6.0;             // default: 6.0, min: 1.0, max: 16.0

	vec3 z = vec3(0.0);
	vec3 d = vec3(1.0);
	float r = 0.0;
	float b = 10000.0;

	for (int i = 0; i < 30; ++i) {
		if (i == NUM_ITERATIONS) {
			break;
		}
		d = EXPONENT * pow(r, EXPONENT-1.0) * d + 1.0;
		if (r > 0.0) {
			float phi = atan(z.z, z.x);
			phi *= EXPONENT;
			float theta = acos(z.y/r);
			theta *= EXPONENT;
			r = pow(r, EXPONENT);
			z = vec3(cos(phi) * cos(theta), sin(theta), sin(phi) * cos(theta)) * r;
		}
		z += p;

		r = length(z);
		b = min(r, b);
		if (r >= 2.0) {
			break;
		}
	}
	return Color(r * log(r) * 0.5 / length(d), hsv2rgb(vec3(b*COLOR_HUE_SCALE+COLOR_HUE_OFFSET, COLOR_SATURATION, COLOR_VALUE*1.3)));
}

Distance MengerSpongeScene(vec3 p)
{
  const int NUM_ITERATIONS = 10;         // default: 10, min: 0, max: 30

  const float SCALE = 3.0;                // default: 3.0, min: 1.0, max: 5.0
  const float C_X = 1.0;                  // default: 1.0, min: 0.0, max: 5.0
  const float C_Y = 1.0;                  // default: 1.0, min: 0.0, max: 5.0
  const float C_Z = 1.0;                  // default: 1.0, min: 0.0, max: 5.0
  const float ROT1_X = 0.0;               // default: 0.0, min: -90.0, max: 90.0
  const float ROT1_Y = 0.0;               // default: 0.0, min: -90.0, max: 90.0
  const float ROT1_Z = 0.0;               // default: 0.0, min: -90.0, max: 90.0
  const float ROT2_X = 0.0;               // default: 0.0, min: -90.0, max: 90.0
  const float ROT2_Y = 0.0;               // default: 0.0, min: -90.0, max: 90.0
  const float ROT2_Z = 0.0;               // default: 0.0, min: -90.0, max: 90.0

	vec3 z = p;
	float b = 10000.0;
	float t = 0.0;

	for (int i = 0; i < 30; ++i) {
		if (i == NUM_ITERATIONS) {
			break;
		}
		z = rotateX(z, ROT1_X);
		z = rotateY(z, ROT1_Y);
		z = rotateZ(z, ROT1_Z);

		z = abs(z);
		if (z.x - z.y < 0.0) { z.xy = z.yx; }
		if (z.x - z.z < 0.0) { z.xz = z.zx; }
		if (z.y - z.z < 0.0) { z.yz = z.zy; }

		z = rotateX(z, ROT2_X);
		z = rotateY(z, ROT2_Y);
		z = rotateZ(z, ROT2_Z);

		z.x = SCALE * z.x - (SCALE-1.0) * C_X;
		z.y = SCALE * z.y - (SCALE-1.0) * C_Y;
		z.z = SCALE * z.z;
		if (z.z > (SCALE-1.0)*0.5 * C_Z) {
			z.z -= (SCALE-1.0) * C_Z;
		}

		float m = dot(z, z);
		b = min(m, b);
		t = float(i+1);
		if (m >= 8.0) {
			break;
		}
	}

	return Color((length(z)-2.0) * pow(SCALE, -t), hsv2rgb(b*COLOR_HUE_SCALE*0.3+COLOR_HUE_OFFSET, COLOR_SATURATION, COLOR_VALUE));
}

Distance SierpinskiDodecahedronScene(vec3 p)
{
  const int NUM_ITERATIONS = 15;         // default: 15, min: 0, max: 30

  const float SCALE = 2.6179;                // default: 2.6179, min: 1.0, max: 5.0
  const float C_X = 1.0;                  // default: 1.0, min: 0.0, max: 5.0
  const float C_Y = 1.0;                  // default: 1.0, min: 0.0, max: 5.0
  const float C_Z = 1.0;                  // default: 1.0, min: 0.0, max: 5.0
  const float ROT1_X = 0.0;               // default: 0.0, min: -90.0, max: 90.0
  const float ROT1_Y = 0.0;               // default: 0.0, min: -90.0, max: 90.0
  const float ROT1_Z = 0.0;               // default: 0.0, min: -90.0, max: 90.0
  const float ROT2_X = 0.0;               // default: 0.0, min: -90.0, max: 90.0
  const float ROT2_Y = 0.0;               // default: 0.0, min: -90.0, max: 90.0
  const float ROT2_Z = 0.0;               // default: 0.0, min: -90.0, max: 90.0

  const float PHI = (sqrt(5.0)+1.0)/2.0;
  const vec3 N1 = normalize(vec3(-1.0, PHI-1.0, 1.0/(PHI-1.0)));
  const vec3 N2 = normalize(vec3(PHI-1.0, 1.0/(PHI-1.0), -1.0));
  const vec3 N3 = normalize(vec3(1.0/(PHI-1.0), -1.0, PHI-1.0));

	vec3 z = p;
	float b = 10000.0;
	float t = 0.0;

	for (int i = 0; i < 30; ++i) {
		if (i == NUM_ITERATIONS) {
			break;
		}
		z = rotateX(z, ROT1_X);
		z = rotateY(z, ROT1_Y);
		z = rotateZ(z, ROT1_Z);

		for (int j = 0; j < 3; ++j) {
			z -= 2.0 * min(0.0, dot(z, N1)) * N1;
			z -= 2.0 * min(0.0, dot(z, N2)) * N2;
			z -= 2.0 * min(0.0, dot(z, N3)) * N3;
		}

		z = rotateX(z, ROT2_X);
		z = rotateY(z, ROT2_Y);
		z = rotateZ(z, ROT2_Z);

		z = SCALE * z - (SCALE-1.0) * vec3(C_X, C_Y, C_Z);

		float m = dot(z, z);
		b = min(m, b);
		t = float(i+1);
		if (m >= 8.0) {
			break;
		}
	}
	return Color((length(z)-2.0) * pow(SCALE, -t), hsv2rgb(b/5.0*COLOR_HUE_SCALE+COLOR_HUE_OFFSET, COLOR_SATURATION, COLOR_VALUE));
}

Distance SierpinskiIcosahedronScene(vec3 p)
{
  const int NUM_ITERATIONS = 15;         // default: 15, min: 0, max: 30

  const float SCALE = 2.0;                // default: 2.0, min: 1.0, max: 5.0
  const float C_X = 0.8507;                  // default: 0.8507, min: 0.0, max: 5.0
  const float C_Y = 0.5257;                  // default: 0.5257, min: 0.0, max: 5.0
  const float C_Z = 0.0;                  // default: 0.0, min: 0.0, max: 5.0
  const float ROT1_X = 0.0;               // default: 0.0, min: -90.0, max: 90.0
  const float ROT1_Y = 0.0;               // default: 0.0, min: -90.0, max: 90.0
  const float ROT1_Z = 0.0;               // default: 0.0, min: -90.0, max: 90.0
  const float ROT2_X = 0.0;               // default: 0.0, min: -90.0, max: 90.0
  const float ROT2_Y = 0.0;               // default: 0.0, min: -90.0, max: 90.0
  const float ROT2_Z = 0.0;               // default: 0.0, min: -90.0, max: 90.0

  const float PHI = (sqrt(5.0)+1.0)/2.0;
  const vec3 N1 = normalize(vec3(-PHI, PHI-1.0, 1.0));
  const vec3 N2 = normalize(vec3(1.0, -PHI, PHI+1.0));
  const vec3 N3 = normalize(vec3(0.0, 0.0, -1.0));

	vec3 z = p;
	float b = 10000.0;
	float t = 0.0;

	z = abs(z);
	z -= 2.0 * max(0.0, dot(z, N1)) * N1;
	z -= 2.0 * max(0.0, dot(z, N2)) * N2;
	z -= 2.0 * max(0.0, dot(z, N3)) * N3;
	z -= 2.0 * max(0.0, dot(z, N2)) * N2;

	for (int i = 0; i < 30; ++i) {
		if (i == NUM_ITERATIONS) {
			break;
		}
		z = rotateX(z, ROT1_X);
		z = rotateY(z, ROT1_Y);
		z = rotateZ(z, ROT1_Z);

		z = abs(z);
		z -= 2.0 * max(0.0, dot(z, N1)) * N1;

		z = rotateX(z, ROT2_X);
		z = rotateY(z, ROT2_Y);
		z = rotateZ(z, ROT2_Z);

		z = SCALE * z - (SCALE-1.0) * vec3(C_X, C_Y, C_Z);

		float m = dot(z, z);
		b = min(m, b);
		t = float(i+1);
		if (m >= 8.0) {
			break;
		}
	}
	return Color((length(z)-2.0) * pow(SCALE, -t), hsv2rgb(b*COLOR_HUE_SCALE+COLOR_HUE_OFFSET, COLOR_SATURATION, COLOR_VALUE));
}

Distance SierpinskiOctahedronScene(vec3 p)
{
  const int NUM_ITERATIONS = 15;         // default: 15, min: 0, max: 30

  const float SCALE = 2.0;                // default: 2.0, min: 1.0, max: 5.0
  const float C_X = 1.0;                  // default: 1.0, min: 0.0, max: 5.0
  const float C_Y = 0.0;                  // default: 0.0, min: 0.0, max: 5.0
  const float C_Z = 0.0;                  // default: 0.0, min: 0.0, max: 5.0
  const float ROT1_X = 0.0;               // default: 0.0, min: -90.0, max: 90.0
  const float ROT1_Y = 0.0;               // default: 0.0, min: -90.0, max: 90.0
  const float ROT1_Z = 0.0;               // default: 0.0, min: -90.0, max: 90.0
  const float ROT2_X = 0.0;               // default: 0.0, min: -90.0, max: 90.0
  const float ROT2_Y = 0.0;               // default: 0.0, min: -90.0, max: 90.0
  const float ROT2_Z = 0.0;               // default: 0.0, min: -90.0, max: 90.0

	vec3 z = p;
	float b = 10000.0;
	float t = 0.0;

	for (int i = 0; i < 30; ++i) {
		if (i == NUM_ITERATIONS) {
			break;
		}
		z = rotateX(z, ROT1_X);
		z = rotateY(z, ROT1_Y);
		z = rotateZ(z, ROT1_Z);

		if (z.x + z.y < 0.0) { z.xy = -z.yx; }
		if (z.x + z.z < 0.0) { z.xz = -z.zx; }
		if (z.x - z.y < 0.0) { z.xy = z.yx; }
		if (z.x - z.z < 0.0) { z.xz = z.zx; }

		z = rotateX(z, ROT2_X);
		z = rotateY(z, ROT2_Y);
		z = rotateZ(z, ROT2_Z);

		z = SCALE * z - (SCALE-1.0) * vec3(C_X, C_Y, C_Z);

		float m = dot(z, z);
		b = min(m, b);
		t = float(i+1);
		if (m >= 8.0) {
			break;
		}
	}
	return Color((length(z)-2.0) * pow(SCALE, -t), hsv2rgb(b*COLOR_HUE_SCALE+COLOR_HUE_OFFSET, COLOR_SATURATION, COLOR_VALUE));
}

Distance SierpinskiTetrahedronScene(vec3 p)
{
  const int NUM_ITERATIONS = 15;         // default: 15, min: 0, max: 30

  const float SCALE = 2.0;                // default: 2.0, min: 1.0, max: 5.0
  const float C_X = 1.0;                  // default: 1.0, min: 0.0, max: 5.0
  const float C_Y = 1.0;                  // default: 1.0, min: 0.0, max: 5.0
  const float C_Z = 1.0;                  // default: 1.0, min: 0.0, max: 5.0
  const float ROT1_X = 0.0;               // default: 0.0, min: -90.0, max: 90.0
  const float ROT1_Y = 0.0;               // default: 0.0, min: -90.0, max: 90.0
  const float ROT1_Z = 0.0;               // default: 0.0, min: -90.0, max: 90.0
  const float ROT2_X = 0.0;               // default: 0.0, min: -90.0, max: 90.0
  const float ROT2_Y = 0.0;               // default: 0.0, min: -90.0, max: 90.0
  const float ROT2_Z = 0.0;               // default: 0.0, min: -90.0, max: 90.0

	vec3 z = p;
	float b = 10000.0;
	float t = 0.0;

	for (int i = 0; i < 30; ++i) {
		if (i == NUM_ITERATIONS) {
			break;
		}
		z = rotateZ(z, ROT1_Z);
		z = rotateY(z, ROT1_Y);
		z = rotateX(z, ROT1_X);

		if (z.x + z.y < 0.0) { z.xy = -z.yx; }
		if (z.x + z.z < 0.0) { z.xz = -z.zx; }
		if (z.y + z.z < 0.0) { z.yz = -z.zy; }

		z = rotateZ(z, ROT2_Z);
		z = rotateY(z, ROT2_Y);
		z = rotateX(z, ROT2_X);

		z = SCALE * z - (SCALE-1.0) * vec3(C_X, C_Y, C_Z);

		float m = dot(z, z);
		b = min(m, b);
		t = float(i+1);
		if (m >= 8.0) {
			break;
		}
	}
	return Color((length(z)-2.0) * pow(SCALE, -t), hsv2rgb(b*COLOR_HUE_SCALE+COLOR_HUE_OFFSET, COLOR_SATURATION, COLOR_VALUE));
}

// {fractal}

Distance Scene(vec3 p) {
  if (fractal_type == JULIABULB) {
    return JuliabulbScene(p);
  } else if (fractal_type == MANDELBOX) {
    return MandelboxScene(p);
  } else if (fractal_type == MANDELBULB) {
    return MandelbulbScene(p);
  } else if (fractal_type == MENGER_SPONGE) {
    return MengerSpongeScene(p);
  } else if (fractal_type == SIERPINSKI_DODECAHEDRON) {
    return SierpinskiDodecahedronScene(p);
  } else if (fractal_type == SIERPINSKI_ICOSAHEDRON) {
    return SierpinskiIcosahedronScene(p);
  } else if (fractal_type == SIERPINSKI_OCTAHEDRON) {
    return SierpinskiOctahedronScene(p);
  } else if (fractal_type == SIERPINSKI_TETRAHEDRON) {
    return SierpinskiTetrahedronScene(p);
  }
}

vec3 Normal(vec3 p, float eps)
{
	vec3 n;
	n.x = Scene(p + vec3(eps, 0.0, 0.0)).value - Scene(p - vec3(eps, 0.0, 0.0)).value;
	n.y = Scene(p + vec3(0.0, eps, 0.0)).value - Scene(p - vec3(0.0, eps, 0.0)).value;
	n.z = Scene(p + vec3(0.0, 0.0, eps)).value - Scene(p - vec3(0.0, 0.0, eps)).value;
	return normalize(n);
}

// {lighting}


vec3 EscapeTimeLighting(int i, vec3 p)
{
  const int MAX_STEPS = 80;
  const float EPS = 0.0004;

	return vec3(1.0 - float(i) / float(MAX_STEPS));
}

float shadow(vec3 p, vec3 dir)
{
  const int MAX_STEPS = 150;
  const int MAX_SHADOW_STEPS = 150;
  const float SHADOW_SOFTNESS = 0.002;

  const float EPS = 0.0008;

	Distance dist = Scene(p);
	float eps = EPS * dist.value / CAMERA_ZOOM;
	float m = 10e6;

	for (int i = 0; i < MAX_SHADOW_STEPS; ++i)
	{
		Distance dist = Scene(p);
		float d = dist.value;

		if (d <= eps) {
			return 0.0;
		}
		m = min(m, d);
		p += dir * d;
	}
	return clamp(m/SHADOW_SOFTNESS, 0.0, 1.0);
}

vec3 LambertShadowLighting(int i, vec3 p)
{
  const vec3 LIGHT_DIR = normalize(vec3(0.3, 0.7, 0.5));
  const float EPS = 0.0008;

	Distance dist = Scene(p);
	float eps = EPS * dist.value / CAMERA_ZOOM;

	vec3 normal = Normal(p, eps);

	return vec3(max(dot(LIGHT_DIR, normal), 0.0) * 0.8 * shadow(p, LIGHT_DIR) + 0.2);
}

vec3 LambertLighting(int i, vec3 p)
{
  const int MAX_STEPS = 150;
  const float EPS = 0.0008;

  const vec3 LIGHT_DIR = normalize(vec3(0.3, 0.7, 0.5));

	Distance dist = Scene(p);
	float eps = EPS * dist.value / CAMERA_ZOOM;

	vec3 normal = Normal(p, eps);

	return vec3(max(dot(LIGHT_DIR, normal), 0.0) * 0.8 + 0.2);
}

Distance SceneGI(vec3 p)
{
	if (length(p) > 20.0) {
		return Light(0.0, vec3(1.2));
	} else {
		return Scene(p);
	}
}

vec3 PathTracingLighting(int i, vec3 p)
{
  const int MAX_STEPS = 100;
  const int MAX_PATH_STEPS = 80;

  const int PATH_REFLECTIONS = 1;
  const float EPS = 0.0008;

	Distance dist = SceneGI(p);
	vec3 color = vec3(1.0);
	vec3 light = vec3(dist.emission);

	for (int j = 0; j < PATH_REFLECTIONS; ++j) {
		Distance dist = SceneGI(p);
		float eps = EPS * dist.value / CAMERA_ZOOM;
		vec3 n = Normal(p, eps);
		vec3 r = randHemisphere(n);
		p += r * eps*500.0;

		bool hit = false;
		for (int i = 0; i < MAX_PATH_STEPS; ++i) {
			Distance dist = SceneGI(p);
			float d = dist.value;

			if (d <= eps) {
				color *= dist.color;
				light += color * dist.emission;
				hit = true;
				break;
			}
			p += r * d;
		}
		if (!hit) {
			break;
		}
	}

	return light;
}

vec3 Lighting(int i, vec3 p) {
  if (lighting_type == ESCAPE_TIME) {
    return EscapeTimeLighting(i, p);
  } else if (lighting_type == LAMBERT_SHADOW) {
    return LambertShadowLighting(i, p);
  } else if (lighting_type == LAMBERT) {
    return LambertLighting(i, p);
  } else if (lighting_type == PATH_TRACING) {
    return PathTracingLighting(i, p);
  }
}

vec3 raymarch(vec3 p, vec3 dir)
{
  const int MAX_MAX_STEPS = 150;
  int MAX_STEPS;
  float EPS;
  if (lighting_type == ESCAPE_TIME) {
    MAX_STEPS = 80;
    EPS = 0.0004;
  } else if (lighting_type == LAMBERT_SHADOW) {
    MAX_STEPS = 150;
    EPS = 0.0008;
  } else if (lighting_type == LAMBERT) {
    MAX_STEPS = 150;
    EPS = 0.0008;
  } else if (lighting_type == PATH_TRACING) {
    MAX_STEPS = 100;
    EPS = 0.0008;
  }

	Distance dist = Scene(p);
	float eps = EPS * dist.value / CAMERA_ZOOM;

	for (int i = 0; i < MAX_MAX_STEPS; ++i)
	{
    if (i >= MAX_STEPS) {
      break;
    }

		Distance dist = Scene(p);
		float d = dist.value;

		if (d <= eps) {
			return dist.color * Lighting(i, p);
		}
		p += dir * d;
	}
	return vec3(0.0);
}

<<<<<<< HEAD
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
=======
vec3 hit(vec3 p, vec3 dir)
{
  const int MAX_MAX_STEPS = 150;
  int MAX_STEPS;
  float EPS;
  if (lighting_type == ESCAPE_TIME) {
    MAX_STEPS = 80;
    EPS = 0.0004;
  } else if (lighting_type == LAMBERT_SHADOW) {
    MAX_STEPS = 150;
    EPS = 0.0008;
  } else if (lighting_type == LAMBERT) {
    MAX_STEPS = 150;
    EPS = 0.0008;
  } else if (lighting_type == PATH_TRACING) {
    MAX_STEPS = 100;
    EPS = 0.0008;
>>>>>>> d8e9dd11f53a0d0cf256bf2867eb6554da55a8d4
  }

	Distance dist = Scene(p);
	float eps = EPS * dist.value / CAMERA_ZOOM;

<<<<<<< HEAD
float BoxDistanceEstimator (vec3 pos) {
  float d0 = DE0 (pos);
  float d2 = DE2 (pos);
  return max (d0, d2);
}

float Sierpinski3 (vec3 z) {
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

float SierpinskiDistanceEstimator (vec3 p) {
  p.yz *= Rotate (0.2 * PI);
  p.yx *= Rotate (0.3 * PI);
  p.xz *= Rotate (0.29 * PI);
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
=======
	for (int i = 0; i < MAX_MAX_STEPS; ++i)
	{
    if (i >= MAX_STEPS) {
>>>>>>> d8e9dd11f53a0d0cf256bf2867eb6554da55a8d4
      break;
    }

		Distance dist = Scene(p);
		float d = dist.value;

<<<<<<< HEAD
    float distance = minDistToScene;
    if (fractal_type <= 3) {
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
=======
		if (d <= eps) {
			return p;
		}
		p += dir * d;
	}
	return p;
>>>>>>> d8e9dd11f53a0d0cf256bf2867eb6554da55a8d4
}

void main(void)
{
	float res = min(screenRes.x, screenRes.y);
	vec2 pos = (gl_FragCoord.xy*2.0 - screenRes) / res;
	randCoord = randSeed + pos;

	pos += vec2(rand()*2.0-1.0, rand()*2.0-1.0) / res;
	pos = rotate2(pos, CAMERA_TILT);
	vec2 bokeh = randHexagon() * CAMERA_BOKEH * cameraSpeed;

	vec3 cameraUp = normalize(cross(cameraRight, cameraDir));
	vec3 cameraCenter = cameraPos + normalize(cameraRight*pos.x + cameraUp*pos.y + cameraDir*CAMERA_ZOOM) * CAMERA_FOCUS * cameraSpeed;
	vec3 cameraOrigin = cameraPos + cameraRight*bokeh.x + cameraUp*bokeh.y;
	vec3 rayDir = normalize(cameraCenter - cameraOrigin);

	vec3 color = raymarch(cameraOrigin, rayDir);

	gl_FragColor = (vec4(color, 1.0) + texture2D(frameBuffer, texCoords) * framesCount) / (framesCount + 1.0);
}
