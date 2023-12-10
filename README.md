# What is in the project

- Ponctual Lights

- Multiple methods for diffuse(Lambertian, Oren Nayar, burley)

- IBL

- IBL generation diffuse

- I tried to implement the specular generation but it does not work

- Texture PBR (Iron textures)

# There is a gui for each step

- Lambertian Diffuse: Display just the lambertian diffuse

- Burley Diffuse: Display just the burley diffuse

- Oren Nayar: Display just the Oren Nayar diffuse

- Cook Torrance: Display just the ggx cook torrance

- Ponctual Lights: Display the Lambertian diffuse with the ggx cook torrance

- IBL Diffuse: Display just the IBL Diffuse with the given prefiltered diffuse

- IBL Specular: Display just the IBL Specular with the given prefiltered specular

- IBL Total: Display the IBL Diffuse and Specular with the given prefiltered diffuse and specular

- IBL Diffuse Gen: Display just the IBL Diffuse generation with an environment downloaded on the internet

- IBL Specular Gen: Not working (tried to generate the ibl specular)

- IBL Total Gen: Display the IBL Diffuse and Specular generation with and environment downloaded on the internet (Not working of course because of IBL Specular Gen)

# Attention

- When clicking on the a box to select an option, make sure to uncheck the box to switch to another option