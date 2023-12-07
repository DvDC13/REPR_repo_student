import { GLContext } from "./gl";
import { mat4, vec3 } from "gl-matrix";
import { UniformType, PixelArray} from './types';
import { Texture, Texture2D } from "./textures/texture";
import { DiffuseShader } from "./shader/diffuse-gen-shader";
import { Camera } from "./camera";
import { PlaneGeometry } from "./geometries/plane";

export class IBLGen {
    private _context: GLContext;

    private _uniforms: Record<string, UniformType | Texture>;

    private _diffuse_gen_texture: Texture2D<PixelArray> | null;

    private _camera: Camera;

    private _plane: PlaneGeometry;
    
    public constructor(context: GLContext, camera: Camera) {

        this._context = context;

        this._diffuse_gen_texture = null;

        this._uniforms = 
        {
            'uModel': mat4.create(),
            'WsToCs': mat4.create(),
        }

        this._camera = camera;

        this._plane = new PlaneGeometry();
        this._context.uploadGeometry(this._plane);
    }
    
    public get uniforms(): Record<string, UniformType | Texture> {
        return this._uniforms;
    }

    public get diffuseTexture(): Texture2D<PixelArray> | null {
        return this._diffuse_gen_texture;
    }

    public async computeDiffuse(DiffuseShader: DiffuseShader, width: number, height: number): Promise<Texture2D<PixelArray> | null> {

        this._context.compileProgram(DiffuseShader);

        let diffuseTexture = new Texture2D<PixelArray>(
            new Uint8Array(width * height * 4),
            width,
            height,
            this._context.gl.RGBA,
            this._context.gl.RGBA8,
            this._context.gl.UNSIGNED_BYTE
        );

        this._context.uploadTexture(diffuseTexture);

        let framebuffer = this._context.gl.createFramebuffer();
        this._context.gl.bindFramebuffer(this._context.gl.FRAMEBUFFER, framebuffer);

        let texture = this._context.getTextures().get(diffuseTexture)?.glObject;

        if (texture === undefined) {
            throw new Error("Texture not found");
        }

        this._context.gl.framebufferTexture2D(
            this._context.gl.FRAMEBUFFER,
            this._context.gl.COLOR_ATTACHMENT0,
            this._context.gl.TEXTURE_2D,
            texture,
            0
        );

        //mat4.copy(this._uniforms['uModel'] as mat4, this._plane

        this._context.gl.viewport(0, 0, width, height);
        this._context.gl.clearColor(0, 0, 0, 1);
        this._context.gl.clear(this._context.gl.COLOR_BUFFER_BIT);

        this._context.draw(this._plane, DiffuseShader, this._uniforms);

        this._context.gl.bindFramebuffer(this._context.gl.FRAMEBUFFER, null);
        this._context.gl.deleteFramebuffer(framebuffer);

        return diffuseTexture;
    }

    public clear_texture(): void {
        this._context.gl.deleteTexture(this._diffuse_gen_texture);
    }
}