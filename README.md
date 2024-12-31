<h1 align="center">mendotran-whatsapp-bot</h1>

<div align="center">
<img src="./docs/WSP-plus-Mendotran.png" alt="Banner del proyecto">
</div>

**Mendotran-whatsapp-bot** es un bot para WhatsApp que permite a los usuarios consultar los horarios de colectivos de la provincia de Mendoza de manera rápida y sencilla. Valiéndose del servicio [Mendotran](https://mendotran.mendoza.gov.ar/), el bot responde a comandos específicos para proporcionar información sobre los horarios de paradas y líneas de colectivos específicas, así como también sobre el metrotranvía. 

<div align="center">
<img src="./docs/ejemplo-parada.jpg" alt="Donde localizar el número de parada">
</div>

*Fuente de la fotografía: ["MendoTran: comenzaron a instalar la señalética en algunas paradas" - Diario El Sol Mendoza](https://www.elsol.com.ar/el-sol/mendotran-comenzaron-a-instalar-la-senaletica-en-algunas-paradas/)*

<div align="center">
<img src="./docs/demo.gif" alt="Demo de comando micro">
</div>

<div align="center">
<img src="./docs/demo2.gif" alt="Demo de comando parada">
</div>

> [!NOTE]
> Puede omitir la "M" y dejar solo el número de parada. 

En el caso que la parada no posea cartel, o el mismo esté vandalizado, el bot puede [localizarla usando su ubicación](#parada-cercana-a-tu-ubicación).

### Metrotranvía

Con este comando podrá solicitar los horarios de una estación de [metrotranvía](https://stmendoza.com/metrotranvia/).

<div align="center">
<img src="./docs/demo5.gif" alt="Demo de comando estación">
</div>

> [!NOTE]
> Este comando admite 3 formas de ser invocado: "estación" (con o sin tilde), "metro" y "metrotranvía".

## Guia
* [Instalación](#instalación)
* [¿Cómo funciona?](#cómo-funciona)
* [Parada cercana a tu ubicación](#parada-cercana-a-tu-ubicación)
* [Pros y contras](#pros-y-contras)
* [Lista de comandos](#lista-de-comandos)

*Núcleo del bot: [udmilla-whatsapp-bot](https://github.com/Lautauro/udmilla-whatsapp-bot). Librería: [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js)*

## Instalación

### 1. Instalar dependencias

Instale los siguientes paquetes utilizando un gestor de paquetes en Linux o bien manualmente en Windows.

```bash
npm chromium git
```

> [!WARNING]
> En **Windows** es probable que tenga que cambiar la línea **"/usr/bin/chromium"**
> en **/src/modules/whatsapp/client.ts** por la ruta de chromium en su sistema.

### 2. Clonar el repositorio

```bash
git clone https://github.com/Lautauro/mendotran-whatsapp-bot.git
cd mendotran-whatsapp-bot
```

### 3. Instalar paquetes NPM

```bash
npm i
```

### 4. Compilar el proyecto e iniciar el servidor

```bash
npm run dev
```
> [!NOTE]
> Puede también usar ```npm build``` para compilar el proyecto y luego ejecutarlo con ```npm start```. 

La primera vez que inicie el servidor tendrá que sincronizar, a través del escaneo de un QR, la cuenta de WhatsApp que usará de bot.

## ¿Cómo funciona?

<div align="center">
<img src="./docs/mendotran-gráfico.png" alt="Gráfica del funcionamiento del bot">
</div>

*Fuentes: [smartphone.svg](https://commons.wikimedia.org/wiki/File:Smartphone-.svg) [whatsapp-icon.svg](https://commons.wikimedia.org/wiki/File:2062095_application_chat_communication_logo_whatsapp_icon.svg) [server.svg](https://commons.wikimedia.org/wiki/File:Server2_by_mimooh.svg)*

El bot utiliza una base datos básica local para funcionar más rápidamente ubicada en **./json/mendotran-data.json**. Si por cualquier motivo necesita regenerar este archivo, bastará con iniciar el bot de la siguiente manera:

```bash
npm run refresh
```

> [!NOTE]
> El archivo viejo será conservado bajo el nombre de **mendotran-data.json.old** .

> [!NOTE]
> En mi experiencia el número de paradas de colectivo que recolecta varía según si se hace un día de semana o un fin de semana. No estoy seguro del porqué de esto pero es necesario que lo mencione.

<div align="center">
<img src="./docs/base-de-datos.png" alt="Base de datos mendotran">
</div>

Así se ve más o menos la estructura de la base de datos:

```json
"stops": {
	// Número de la parada
	"M8845": {
		// ID interna
        "id": "1606_62489",
		// Coordenadas
        "pos": [
            -33.2228834,
            -68.8925633
        ],
		// Dirección
        "address": "Av. San Martín (Luján de Cuyo, Mendoza)",
		// Colectivos que paran ahí
        "busList": [
			"701",
			"704",
			"705",
			"708",
			"713",
			"714",
			"764",
			"766",
			"767"
		]
    }
},
"buses": {
	// Número de la línea
	"701": {
		// ID interna
		"id": "1606_166733",
		// Cartel del micro
		"shortName": "701 UGARTECHE - Bº TIERRA SOL Y LUNA",
		"color": "🟦"
	}
}
```

## Parada cercana a tu ubicación

Si se desconoce el número de parada, enviando una ubicación al bot y respondiendo a la misma con alguno de los comandos, el sistema se encargará de buscar la parada más cercana y despachar sus horarios.

**Comando "micro"** para saber los horarios de **UNA** línea en específico:

<div align="center">
<img src="./docs/demo3.gif" alt="Demo de comando 'micro' usando la ubicación enviada por el usuario">
</div>

**Comando "parada"** para mostrar los horarios de **TODOS** los colectivos de una parada:

<div align="center">
<img src="./docs/demo4.gif" alt="Demo de comando 'parada' usando la ubicación enviada por el usuario">
</div>

## Pros y contras

**TLDR:** Este bot ofrece una forma conveniente y rápida de acceder a la información de horarios de colectivos, aunque requiere un poco de configuración inicial y puede no ser ideal para todos los usuarios.

|PROS |CONTRAS|
|:---:|:-----:|
|El usuario no necesita gastar datos móviles entrando a la app oficial de Mendotran. Esto es incluso mejor si tiene WhastApp gratis con su compañía de celular.|El bot debe estar corriendo en un servidor para funcionar.|
|Puede ser más rápido que usar la aplicación oficial, esto dependerá de la velocidad del servidor y de la experiencia previa del usuario con el uso de bots.|Requiere más o menos tiempo habituarse a la lógica de los comandos. Habrá personas que prefieran el uso de una interfaz gráfica de usuario ([GUI](https://en.wikipedia.org/wiki/Graphical_user_interface)) antes que una interfaz de texto ([TUI](https://en.wikipedia.org/wiki/Text-based_user_interface)).|
|Si la privacidad le concierne, ésta forma de usar el servicio debería ser más privada, ya que el usuario no interactúa directamente con Mendotran sino el servidor. Mendotran afirma en su [Play Store](https://play.google.com/store/apps/details?id=com.wara.mendotran&hl=es_AR) que no recolecta datos del usuario, sin embargo se contradice en las [políticas de privacidad](https://mendotran.mendoza.gov.ar/politica) de su sitio web.|Si la privacidad le concierne probablemente no deba utilizar WhatsApp.|
|Más espacio libre en su dispositivo móvil al no tener instalada la aplicación.|Necesita saber el número de la parada de colectivos, en el caso contrario puede pedirle al bot que [busque la parada más cercana a su ubicación actual](#parada-cercana-a-tu-ubicación). Esto último hace que pierda sentido el punto de usar menos datos, ya que Google Maps haría uso de los mismos.|

## Lista de comandos

|Alias|Sintaxis|Función|Ejemplo|
|:---:|:---|:---:|:---|
|**🚍<br>Micro<br>M**|Micro *[Línea]* *[Nº de parada]*|Obtener los horarios de **un colectivo** en una parada.|Micro **120** **M14408**<br>(La "M" es opcional)|
|**🚏<br>Parada<br>P**|Parada *[Nº de parada]*|Obtener **todos** los horarios de una parada de colectivos.|Parada **M5707**<br>(La "M" es opcional)|
|**📍<br>Paradas**|**> [Citar ubicación]**<br>Paradas|Lista las paradas cercanas a una ubicación.|Paradas|
|**🚊<br>Estación<br>Metro<br>Metrotranvía**|Estacion *[Nombre de la estación]*|Obtener los horarios de **una estación de metrotranvía**.|Estacion **Godoy**|
|**❓<br>Ayuda<br>Help<br>?**|Ayuda *[Comando]*|Solicitar información sobre el uso de un comando.|Ayuda **Micro**|

> [!NOTE]
> Existe la alternativa de localizar una parada por cercanía a una ubicación. Tan solo basta con enviar primero la ubicación, citarla (es decir darle a "responder" al mensaje) y utilizar alguno de estos comandos: parada, micro ó paradas. [Vea el ejemplo](#parada-cercana-a-tu-ubicación).