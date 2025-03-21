import { GUI } from 'dat.gui';
import { mat4, vec3, quat } from 'gl-matrix';
import { Camera } from './camera';
import { GLContext } from './gl';
import { PBRShader } from './shader/pbr-shader';
import { Texture, Texture2D } from './textures/texture';
import { PixelArray, UniformType } from './types';
import { SphereGeometry } from './geometries/sphere';
import { PointLight } from './lights/lights';
import { DiffuseShader } from './shader/diffuse-gen-shader';
import { SpecularShader } from './shader/specular-gen-shader';
import { TriangleGeometry } from './geometries/triangle';

interface GUIProperties {
  albedo: number[];
}

/**
 * Class representing the current application with its state.
 *
 * @class Application
 */
class Application {
  /**
   * Context used to draw to the canvas
   *
   * @private
   */
  private _context: GLContext;

  private _shader: PBRShader;
  private _diffuseShader: DiffuseShader;
  private _specularShader: SpecularShader;
  private _geometry_sphere: SphereGeometry;
  private _geometry_triangle: TriangleGeometry;
  private _uniforms: Record<string, UniformType | Texture>;

  private _grid_size: number;

  private _pointLight: PointLight;

  private _framebuffer_diffuse: WebGLFramebuffer | null;
  private _framebuffer_specular: WebGLFramebuffer | null;

  private _textureBrdfPreInt: Texture2D<HTMLElement> | null;
  private _texturePrefilteredDiffuse: Texture2D<HTMLElement> | null;
  private _texturePrefilteredSpecular: Texture2D<HTMLElement> | null;

  private _textureIronColor: Texture2D<HTMLElement> | null;
  private _textureIronNormal: Texture2D<HTMLElement> | null;
  private _textureIronRoughness: Texture2D<HTMLElement> | null;
  private _textureIronMetallic: Texture2D<HTMLElement> | null;

  private _texture_env: Texture2D<HTMLElement> | null;
  private _texture_env_diffuse: Texture2D<PixelArray> | null;
  private _texture_env_specular: Texture2D<PixelArray> | null;

  private _lambertian_diffuse_option : boolean;
  private _burley_diffuse_option : boolean;
  private _oren_nayar_diffuse_option : boolean;
  private _cook_torrance_specular_option : boolean;
  private _ponctualLights_option : boolean;
  private _texture_pbr_option : boolean;
  private _imageBasedLighting_diffuse_option : boolean;
  private _imageBasedLighting_specular_option : boolean;
  private _imageBasedLighting_option : boolean;
  private _imageBasedLighting_diffuse_gen_option : boolean;
  private _imageBasedLighting_specular_gen_option : boolean;
  private _imageBasedLighting_gen_option : boolean;

  private _camera: Camera;

  private _mouseClicked: boolean;
  private _mouseCurrentPosition: { x: number, y: number };

  /**
   * Object updated with the properties from the GUI
   *
   * @private
   */
  private _guiProperties: GUIProperties;

  constructor(canvas: HTMLCanvasElement) {
    this._context = new GLContext(canvas);
    this._camera = new Camera();
    vec3.set(this._camera.position, 0.0, 0.0, 5.0);

    this._pointLight = new PointLight();
    this._pointLight.setPosition(0.0, 10.0, 10.0);
    this._pointLight.setColorRGB(1.0, 1.0, 1.0);
    this._pointLight.setIntensity(1.0);

    this._mouseClicked = false;
    this._mouseCurrentPosition = { x: 0, y: 0 };

    this._grid_size = 5;

    this._geometry_sphere = new SphereGeometry(0.2, 32, 32);
    this._uniforms = {
      'uMaterial.albedo': vec3.create(),
      'uCamera.WsToCs': mat4.create(),
      'uCamera.position': vec3.create(),
      'uModel': mat4.create(),
      'roughness': 0.0,
      'metallic': 0.0,
      'ponctualLights_option': false,
      'texture_pbr_option': false,
      'imageBasedLighting_option': false,
      'imageBasedLighting_diffuse_gen_option': false,
    };

    this._geometry_triangle = new TriangleGeometry();

    this._framebuffer_diffuse = null;
    this._framebuffer_specular = null;

    let lights = [
      {
        position: vec3.fromValues(-10.0, 10.0, 10.0),
        color: vec3.fromValues(1.0, 1.0, 1.0),
        intensity: 1.0
      },
      {
        position: vec3.fromValues(10.0, 10.0, 10.0),
        color: vec3.fromValues(1.0, 1.0, 1.0),
        intensity: 1.0
      },
      {
        position: vec3.fromValues(-10.0, -10.0, 10.0),
        color: vec3.fromValues(1.0, 1.0, 1.0),
        intensity: 1.0
      },
      {
        position: vec3.fromValues(10.0, -10.0, 10.0),
        color: vec3.fromValues(1.0, 1.0, 1.0),
        intensity: 1.0
      }
    ];

    for (const [index, light] of lights.entries()) {
      this._uniforms['uLight[' + index + '].position'] = light.position;
      this._uniforms['uLight[' + index + '].color'] = light.color;
      this._uniforms['uLight[' + index + '].intensity'] = light.intensity;
    }

    this._diffuseShader = new DiffuseShader();
    this._specularShader = new SpecularShader();

    this._shader = new PBRShader();
    this._textureBrdfPreInt = null;
    this._texturePrefilteredDiffuse = null;
    this._texturePrefilteredSpecular = null;

    this._textureIronColor = null;
    this._textureIronNormal = null;
    this._textureIronRoughness = null;
    this._textureIronMetallic = null;

    this._texture_env = null;
    this._texture_env_diffuse = null;
    this._texture_env_specular = null;

    this._lambertian_diffuse_option = false;
    this._burley_diffuse_option = false;
    this._oren_nayar_diffuse_option = false;
    this._cook_torrance_specular_option = false;
    this._ponctualLights_option = false;
    this._texture_pbr_option = false;
    this._imageBasedLighting_diffuse_option = false;
    this._imageBasedLighting_specular_option = false;
    this._imageBasedLighting_option = false;
    this._imageBasedLighting_diffuse_gen_option = false;
    this._imageBasedLighting_specular_gen_option = false;
    this._imageBasedLighting_gen_option = false;

    this._shader.pointLightCount = 4;

    this._guiProperties = {
      albedo: [255, 255, 255]
    };

    this._createGUI();
  }

  /**
   * Initializes the application.
   */
  async init() {
    this._context.uploadGeometry(this._geometry_sphere);
    this._context.uploadGeometry(this._geometry_triangle);
    
    this._context.compileProgram(this._shader);
    
    // Example showing how to load a texture and upload it to GPU.
    this._textureBrdfPreInt = await Texture2D.load(
      'assets/ggx-brdf-integrated.png'
    );
    if (this._textureBrdfPreInt !== null) {
      this._context.uploadTexture(this._textureBrdfPreInt);
      // You can then use it directly as a uniform:
      this._uniforms.brdfPreInt = this._textureBrdfPreInt;
    }

    // Example showing how to load a texture and upload it to GPU.
    this._texturePrefilteredDiffuse = await Texture2D.load(
      'assets/env/Alexs_Apt_2k-diffuse-RGBM.png'
    );
    if (this._texturePrefilteredDiffuse !== null) {
      this._context.uploadTexture(this._texturePrefilteredDiffuse);
      // You can then use it directly as a uniform:
      this._uniforms.prefilteredDiffuse = this._texturePrefilteredDiffuse;
    }

    // Example showing how to load a texture and upload it to GPU.
    this._texturePrefilteredSpecular = await Texture2D.load(
      'assets/env/Alexs_Apt_2k-specular-RGBM.png'
    );

    if (this._texturePrefilteredSpecular !== null) {
      this._context.uploadTexture(this._texturePrefilteredSpecular);
      // You can then use it directly as a uniform:
      this._uniforms.prefilteredSpecular = this._texturePrefilteredSpecular;
    }

    // Example showing how to load a texture and upload it to GPU.
    this._textureIronColor = await Texture2D.load(
      'assets/textures/rusted_iron/rustediron2_basecolor.png'
    );

    if (this._textureIronColor !== null) {
      this._context.uploadTexture(this._textureIronColor);
      // You can then use it directly as a uniform:
      this._uniforms.ironColor = this._textureIronColor;
    }

    // Example showing how to load a texture and upload it to GPU.
    this._textureIronNormal = await Texture2D.load(
      'assets/textures/rusted_iron/rustediron2_normal.png'
    );

    if (this._textureIronNormal !== null) {
      this._context.uploadTexture(this._textureIronNormal);
      // You can then use it directly as a uniform:
      this._uniforms.ironNormal = this._textureIronNormal;
    }

    // Example showing how to load a texture and upload it to GPU.
    this._textureIronRoughness = await Texture2D.load(
      'assets/textures/rusted_iron/rustediron2_roughness.png'
    );

    if (this._textureIronRoughness !== null) {
      this._context.uploadTexture(this._textureIronRoughness);
      // You can then use it directly as a uniform:
      this._uniforms.ironRoughness = this._textureIronRoughness;
    }

    // Example showing how to load a texture and upload it to GPU.
    this._textureIronMetallic = await Texture2D.load(
      'assets/textures/rusted_iron/rustediron2_metallic.png'
    );

    if (this._textureIronMetallic !== null) {
      this._context.uploadTexture(this._textureIronMetallic);
      // You can then use it directly as a uniform:
      this._uniforms.ironMetallic = this._textureIronMetallic;
    }

    this._texture_env = await Texture2D.load(
      'assets/thatch_chapel_4k.png'
    );

    if (this._texture_env !== null) {
      this._context.uploadTexture(this._texture_env);
      // You can then use it directly as a uniform:
      this._uniforms.texture_env = this._texture_env;
    }

    // **************************** //
    // Compute the diffuse texture.
    // **************************** //
    const targetTextureWidth = 256;
    const targetTextureHeight = 256;
    this._texture_env_diffuse = new Texture2D<PixelArray>(
      new Uint8Array(targetTextureWidth * targetTextureHeight * 4),
      targetTextureWidth,
      targetTextureHeight,
      this._context.gl.RGBA,
      this._context.gl.RGBA,
      this._context.gl.UNSIGNED_BYTE
    );

    this._context.uploadTexture(this._texture_env_diffuse);

    {
      const level = 0;
      const internalFormat = this._context.gl.RGBA;
      const border = 0;
      const format = this._context.gl.RGBA;
      const type = this._context.gl.UNSIGNED_BYTE;
      const data = null;
      this._context.gl.texImage2D(this._context.gl.TEXTURE_2D, level, internalFormat,
        targetTextureWidth, targetTextureHeight, border,
        format, type, data);

      // Set the parameters so we can render any size image.
      this._context.gl.texParameteri(this._context.gl.TEXTURE_2D, this._context.gl.TEXTURE_MIN_FILTER, this._context.gl.LINEAR);
      this._context.gl.texParameteri(this._context.gl.TEXTURE_2D, this._context.gl.TEXTURE_WRAP_S, this._context.gl.CLAMP_TO_EDGE);
      this._context.gl.texParameteri(this._context.gl.TEXTURE_2D, this._context.gl.TEXTURE_WRAP_T, this._context.gl.CLAMP_TO_EDGE);
    }

    this._framebuffer_diffuse = this._context.gl.createFramebuffer();
    this._context.gl.bindFramebuffer(this._context.gl.FRAMEBUFFER, this._framebuffer_diffuse);

    // attach the texture as the first color attachment
    const attachmentPoint = this._context.gl.COLOR_ATTACHMENT0;
    var textureObject = this._context.getTextures().get(this._texture_env_diffuse)?.glObject;

    if (textureObject === undefined) {
      throw new Error('Texture not found');
    }

    this._context.gl.framebufferTexture2D(this._context.gl.FRAMEBUFFER, attachmentPoint, this._context.gl.TEXTURE_2D, textureObject, 0);

    this._context.gl.viewport(0, 0, targetTextureWidth, targetTextureHeight);
    this._context.gl.clear(this._context.gl.COLOR_BUFFER_BIT | this._context.gl.DEPTH_BUFFER_BIT)

    // Compile the diffuse shader.
    this._context.compileProgram(this._diffuseShader);

    // Use the diffuse shader.
    this._context.useProgram(this._diffuseShader);

    // Draw the triangle.
    this._context.draw(this._geometry_triangle, this._diffuseShader, this._uniforms);

    // Unbind the framebuffer, and set the viewport back to the canvas size.
    this._context.gl.bindFramebuffer(this._context.gl.FRAMEBUFFER, null);

    // Set the viewport to the canvas size.
    this._context.gl.viewport(0, 0, this._context.gl.drawingBufferWidth, this._context.gl.drawingBufferHeight);

    // Set the diffuse texture.
    if (this._texture_env_diffuse !== null) {
      this._uniforms.texture_env_diffuse = this._texture_env_diffuse;
    }

    // **************************** //
    // Compute the specular texture.
    // **************************** //

    this._texture_env_specular = new Texture2D<PixelArray>(
      new Uint8Array(targetTextureWidth * targetTextureHeight * 4),
      targetTextureWidth,
      targetTextureHeight,
      this._context.gl.RGBA,
      this._context.gl.RGBA,
      this._context.gl.UNSIGNED_BYTE
    );

    this._context.uploadTexture(this._texture_env_specular);

    {
      const level = 0;
      const internalFormat = this._context.gl.RGBA;
      const border = 0;
      const format = this._context.gl.RGBA;
      const type = this._context.gl.UNSIGNED_BYTE;
      const data = null;
      this._context.gl.texImage2D(this._context.gl.TEXTURE_2D, level, internalFormat,
        targetTextureWidth, targetTextureHeight, border,
        format, type, data);

      // Set the parameters so we can render any size image.
      this._context.gl.texParameteri(this._context.gl.TEXTURE_2D, this._context.gl.TEXTURE_MIN_FILTER, this._context.gl.LINEAR);
      this._context.gl.texParameteri(this._context.gl.TEXTURE_2D, this._context.gl.TEXTURE_WRAP_S, this._context.gl.CLAMP_TO_EDGE);
      this._context.gl.texParameteri(this._context.gl.TEXTURE_2D, this._context.gl.TEXTURE_WRAP_T, this._context.gl.CLAMP_TO_EDGE);
    }

    this._framebuffer_specular = this._context.gl.createFramebuffer();
    this._context.gl.bindFramebuffer(this._context.gl.FRAMEBUFFER, this._framebuffer_specular);

    // attach the texture as the first color attachment
    const attachmentPoint2 = this._context.gl.COLOR_ATTACHMENT0;
    var textureObject2 = this._context.getTextures().get(this._texture_env_specular)?.glObject;

    if (textureObject2 === undefined) {
      throw new Error('Texture not found');
    }

    this._context.gl.framebufferTexture2D(this._context.gl.FRAMEBUFFER, attachmentPoint2, this._context.gl.TEXTURE_2D, textureObject2, 0);

    this._context.gl.viewport(0, 0, targetTextureWidth, targetTextureHeight);

    // Compile the specular shader.
    this._context.compileProgram(this._specularShader);

    // Use the specular shader.
    this._context.useProgram(this._specularShader);

    // Draw the triangle.
    this._context.draw(this._geometry_triangle, this._specularShader, this._uniforms);

    // Unbind the framebuffer, and set the viewport back to the canvas size.
    this._context.gl.bindFramebuffer(this._context.gl.FRAMEBUFFER, null);

    // Set the viewport to the canvas size.
    this._context.gl.viewport(0, 0, this._context.gl.drawingBufferWidth, this._context.gl.drawingBufferHeight);

    // Set the specular texture.
    if (this._texture_env_specular !== null) {
      this._uniforms.texture_env_specular = this._texture_env_specular;
    }

    // Event handlers (mouse and keyboard)
    canvas.addEventListener('keydown', this.onKeyDown, true);
    canvas.addEventListener('pointerdown', this.onPointerDown, true);
    canvas.addEventListener('pointermove', this.onPointerMove, true);
    canvas.addEventListener('pointerup', this.onPointerUp, true);
    canvas.addEventListener('pointerleave', this.onPointerUp, true);
  }

  /**
   * Called at every loop, before the [[Application.render]] method.
   */
  update() {
    /** Empty. */
  }

  /**
   * Called when the canvas size changes.
   */
  resize() {
    this._context.resize();
  }

  /**
   * Called at every loop, after the [[Application.update]] method.
   */
  render() {
    this._context.clear();
    this._context.setDepthTest(true);
    // this._context.setCulling(WebGL2RenderingContext.BACK);

    const props = this._guiProperties;

    // Set the color from the GUI into the uniform list.
    vec3.set(
      this._uniforms['uMaterial.albedo'] as vec3,
      props.albedo[0] / 255,
      props.albedo[1] / 255,
      props.albedo[2] / 255
    );

    // Sets the view projection matrix.
    const aspect = this._context.gl.drawingBufferWidth / this._context.gl.drawingBufferHeight;
    let WsToCs = this._uniforms['uCamera.WsToCs'] as mat4;
    mat4.multiply(WsToCs, this._camera.computeProjection(aspect), this._camera.computeView());

    // **Note**: if you want to modify the position of the geometry, you will
    // need to add a model matrix, corresponding to the mesh's matrix.

    // Set the camera position.
    this._uniforms['uCamera.position'] = this._camera.position;

    // Set the light position.
    this._uniforms['uLight.position'] = this._pointLight.positionWS;
    // Set the light color.
    this._uniforms['uLight.color'] = this._pointLight.color;
    // Set the light intensity.
    this._uniforms['uLight.intensity'] = this._pointLight.intensity;

    // Set the boolean for the lambertian diffuse.
    this._uniforms['lambertian_diffuse_option'] = this._lambertian_diffuse_option;
    // Set the boolean for the burley diffuse.
    this._uniforms['burley_diffuse_option'] = this._burley_diffuse_option;
    // Set the boolean for the oren nayar diffuse.
    this._uniforms['oren_nayar_diffuse_option'] = this._oren_nayar_diffuse_option;
    // Set the boolean for the cook torrance specular.
    this._uniforms['cook_torrance_specular_option'] = this._cook_torrance_specular_option;
    // Set the boolean for the ponctual lights.
    this._uniforms['ponctualLights_option'] = this._ponctualLights_option;
    // Set the boolean for the texture pbr.
    this._uniforms['texture_pbr_option'] = this._texture_pbr_option;
    // Set the boolean for the image based lighting diffuse.
    this._uniforms['imageBasedLighting_diffuse_option'] = this._imageBasedLighting_diffuse_option;
    // Set the boolean for the image based lighting specular.
    this._uniforms['imageBasedLighting_specular_option'] = this._imageBasedLighting_specular_option;
    // Set the boolean for the image based lighting.
    this._uniforms['imageBasedLighting_option'] = this._imageBasedLighting_option;
    // Set the boolean for the image based lighting diffuse gen.
    this._uniforms['imageBasedLighting_diffuse_gen_option'] = this._imageBasedLighting_diffuse_gen_option;
    // Set the boolean for the image based lighting specular gen.
    this._uniforms['imageBasedLighting_specular_gen_option'] = this._imageBasedLighting_specular_gen_option;
    // Set the boolean for the image based lighting gen.
    this._uniforms['imageBasedLighting_gen_option'] = this._imageBasedLighting_gen_option;

    // Array of roughness values to test.
    let roughnessValues = [0.0025, 0.04, 0.16, 0.36, 0.64];
    // Array of metallic values to test.
    let metallicValues = [0.0, 0.2, 0.4, 0.6, 0.8];

    // Draw the spheres.
    let grid_size_half = Math.floor(this._grid_size / 2);
    for (let i = -grid_size_half; i <= grid_size_half; i++)
    {
      for (let j = -grid_size_half; j <= grid_size_half; j++)
      {
        let modelMatrix = mat4.create();
        modelMatrix = mat4.identity(modelMatrix);
        mat4.translate(modelMatrix, modelMatrix, vec3.fromValues(j * 0.5, i * 0.5, 0.0));
        this._uniforms['uModel'] = modelMatrix;

        this._uniforms['roughness'] = roughnessValues[j + grid_size_half];
        this._uniforms['metallic'] = metallicValues[i + grid_size_half];

        // Draw the sphere.
        this._context.draw(this._geometry_sphere, this._shader, this._uniforms);
      }
    }
  }

  /**
   * Creates a GUI floating on the upper right side of the page.
   *
   * ## Note
   *
   * You are free to do whatever you want with this GUI. It's useful to have
   * parameters you can dynamically change to see what happens.
   *
   *
   * @private
   */
  private _createGUI(): GUI {
    const gui = new GUI();
    gui.addColor(this._guiProperties, 'albedo');
    gui.add(this._camera.position, '0', -5.0, 5.0).name('camera x');
    gui.add(this._camera.position, '1', -5.0, 5.0).name('camera y');
    gui.add(this._camera.position, '2', -5.0, 5.0).name('camera z');
    gui.add(this, '_lambertian_diffuse_option').name('Lambertian Diffuse');
    gui.add(this, '_burley_diffuse_option').name('Burley Diffuse');
    gui.add(this, '_oren_nayar_diffuse_option').name('Oren Nayar Diffuse');
    gui.add(this, '_cook_torrance_specular_option').name('Cook Torrance Specular');
    gui.add(this, '_ponctualLights_option').name('Ponctual Lights');
    gui.add(this, '_texture_pbr_option').name('Texture PBR');
    gui.add(this, '_imageBasedLighting_diffuse_option').name('IBL Diffuse');
    gui.add(this, '_imageBasedLighting_specular_option').name('IBL Specular');
    gui.add(this, '_imageBasedLighting_option').name('IBL Total');
    gui.add(this, '_imageBasedLighting_diffuse_gen_option').name('IBL Diffuse Gen');
    gui.add(this, '_imageBasedLighting_specular_gen_option').name('IBL Specular Gen');
    gui.add(this, '_imageBasedLighting_gen_option').name('IBL Total Gen');
    return gui;
  }

  /**
   * Handle keyboard and mouse inputs to translate and rotate camera.
   */
  onKeyDown(event: KeyboardEvent) {
    const speed = 0.2;

    let forwardVec = vec3.fromValues(0.0, 0.0, -speed);
    vec3.transformQuat(forwardVec, forwardVec, app._camera.rotation);
    let rightVec = vec3.fromValues(speed, 0.0, 0.0);
    vec3.transformQuat(rightVec, rightVec, app._camera.rotation);

    if (event.key == 'z' || event.key == 'ArrowUp') {
      vec3.add(app._camera.position, app._camera.position, forwardVec);
    }
    else if (event.key == 's' || event.key == 'ArrowDown') {
      vec3.add(app._camera.position, app._camera.position, vec3.negate(forwardVec, forwardVec));
    }
    else if (event.key == 'd' || event.key == 'ArrowRight') {
      vec3.add(app._camera.position, app._camera.position, rightVec);
    }
    else if (event.key == 'q' || event.key == 'ArrowLeft') {
      vec3.add(app._camera.position, app._camera.position, vec3.negate(rightVec, rightVec));
    }
  }

  onPointerDown(event: MouseEvent) {
    app._mouseCurrentPosition.x = event.clientX;
    app._mouseCurrentPosition.y = event.clientY;
    app._mouseClicked = true;
  }

  onPointerMove(event: MouseEvent) {
    if (!app._mouseClicked) {
      return;
    }

    const dx = event.clientX - app._mouseCurrentPosition.x;
    const dy = event.clientY - app._mouseCurrentPosition.y;
    const angleX = dy * 0.002;
    const angleY = dx * 0.002;
    quat.rotateX(app._camera.rotation, app._camera.rotation, angleX);
    quat.rotateY(app._camera.rotation, app._camera.rotation, angleY);

    app._mouseCurrentPosition.x = event.clientX;
    app._mouseCurrentPosition.y = event.clientY;
  }

  onPointerUp(event: MouseEvent) {
    app._mouseClicked = false;
  }

}

const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
const app = new Application(canvas as HTMLCanvasElement);
app.init();

function animate() {
  app.update();
  app.render();
  window.requestAnimationFrame(animate);
}
animate();

/**
 * Handles resize.
 */

const resizeObserver = new ResizeObserver((entries) => {
  if (entries.length > 0) {
    const entry = entries[0];
    canvas.width = window.devicePixelRatio * entry.contentRect.width;
    canvas.height = window.devicePixelRatio * entry.contentRect.height;
    app.resize();
  }
});

resizeObserver.observe(canvas);
