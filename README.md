<h1 align="center">udmilla-mendotran-bot</h1>

**Udmilla-mendotran-bot** es un bot para WhatsApp el cual nos permite, valiéndose del servicio Mendotran, saber los horarios de una parada de colectivo a través del uso de comandos enviados por WhatsApp.

![Demo de comando "micro"](/docs/demo.gif)

![Demo de comando "parada"](/docs/demo2.gif)

## Guia

- [Instalación](#instalación)
- [¿Cómo funciona?](#¿cómo-funciona)
- [Qué hace y qué no hace el bot](#qué-hace-y-qué-no-hace-el-bot)
- [Parada cercana a tu ubicación](#parada-cercana-a-tu-ubicación)
- [Pros y contras](#pros-y-contras)
- [Lista de comandos](#lista-de-comandos)
- [Cosas por hacer](#cosas-por-hacer)

## Consideraciones preliminares para personas no-técnicas

Este proyecto, aún estando pensado para ser lo más simple posible y no tener que lidiar con aspectos técnicos como la programación, **requiere cierta familiaridad con algunos conceptos informáticos**. A pesar de esto, una persona con un conocimiento abstracto del tema, y con interés en la materia, debería ser capaz de hacerlo funcionar investigando un poco por su cuenta. Por mucho que me gustaría que cualquier persona pueda alojar este bot, lo cierto es que requiere de ciertas cualidades y conocimientos que no todos poseen, pero que sí pueden lograr. A continuación dejo algunos enlaces que quizá le sirvan a estas personas:

* [Interfaz de línea de comandos](https://es.wikipedia.org/wiki/Interfaz_de_l%C3%ADnea_de_comandos)
* [Servidor](https://es.wikipedia.org/wiki/Servidor)
* [La guía para principiantes de Git y Github](https://www.freecodecamp.org/espanol/news/guia-para-principiantes-de-git-y-github/)
* [Instalar Git](https://github.com/git-guides/install-git)
* [¿Qué es NPM?](https://www.freecodecamp.org/espanol/news/node-js-npm-tutorial/)
* [Descarga e instalación de Node.js y NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

Para usuarios más avanzados en el tema toda esta información no le debería ser relevante, hasta podrían considerar absurdo este intento por educar a usuarios comunes y corrientes. Para responder a esto voy a citar a una de las **cuatro libertades esenciales del [Software Libre](https://www.gnu.org/philosophy/free-sw.es.html)** en la cual me baso:

> Libertad de estudiar cómo funciona el programa, y cambiarlo para que haga lo que se desee. El acceso al código fuente es una condición necesaria para ello.

Para apoyar esta libertad es necesario educar a las personas interesadas. **Doy por sentado que el usuario es perfectamente capaz de investigar por su cuenta y no pretendo guiar de la mano al mismo**, sino darle un empujón inicial para que se eduque y despierte esa inquietud por el conocimiento. Así aprendimos muchos.

## Instalación

**Aclaración, al ser usuario de Linux no tengo ni la remota idea de si esto funciona o no en Windows o Mac, debería, pero no lo he probado aún.**

### 1. Clonar el repositorio

```bash
git clone
```

### 2. Instalar paquetes

```bash
npm i
```

### 3. Compilar el proyecto 

```bash
npm run build
```

### 4. Iniciar servidor

La primera vez que lo inicies sucederan dos cosas. Lo primero, va a generar la base de datos con la que se va a comunicar con Mendotran. Y segundo, te va a hacer escanear un QR para iniciar sesión en la cuenta de WhatsApp que vayas a usar de bot.

```bash
npm start
```

Más información en cómo funciona la base del bot en: [https://github.com/Lautauro/udmilla-whatsapp-bot](https://github.com/Lautauro/udmilla-whatsapp-bot)

## ¿Cómo funciona?

> TODO

## Qué hace y qué no hace el bot

> TODO

## Parada cercana a tu ubicación

Si se desconoce el número de parada, enviando una ubicación el bot se encargará de buscar la parada más cercana y enviar sus horarios. Muy útil para paradas sin cartel o con cartel vandalizado.

Comando **"micro"**, para saber un colectivo en específico:

![Demo de comando "micro" usando ubicación](/docs/demo3.gif)

Comando **"parada"**, para mostrar todos los colectivos de una parada:

![Demo de comando "parada" usando ubicación](/docs/demo4.gif)

## Pros y contras

|PROS |CONTRAS|
|:---:|:---:  |
|En caso de tener WhastApp gratis con su compañía de celular, **no necesita gastar datos entrando a la app oficial de Mendotran**.|**Usted deberá hostear el bot** por su cuenta en un servidor, o bien valerse de uno alojado por otro usuario.|
|Puede hasta ser **más rápido que usar la aplicación oficial**. Esto dependerá de la velocidad del servidor y de la experiencia previa del usuario con el uso de bots.|**Requiere más o menos tiempo habituarse a la lógica de los comandos.** Habrá personas que prefieran el uso de una interfaz gráfica de usuario ([GUI](https://en.wikipedia.org/wiki/Graphical_user_interface)) antes que una interfaz de texto ([TUI](https://en.wikipedia.org/wiki/Text-based_user_interface)).|
|Si la privacidad le parece un tema importante, en principio **ésta forma de usar el servicio debería ser más privada**, ya que no es el cliente quien hace las peticiones a Mendotran sino el servidor (Menos riesgo de recolección de datos). Más info en como usa nuestros datos la app [aquí](https://mendotran.mendoza.gov.ar/politica).|Estás usando WhatsApp, si la privacidad es algo que te concierne probablemente estés en el sitio equivocado. **Mendotran afirma en su [Play Store](https://play.google.com/store/apps/details?id=com.wara.mendotran&hl=es_AR) que no recolecta datos del usuario, sin embargo se contradice en las [políticas de privacidad](https://mendotran.mendoza.gov.ar/politica) de su sitio web.**|
|No tiene que tener instalada la aplicación de Mendotran en su celular, lo que es igual a **más espacio libre**.|**Necesita saber el número de la parada de colectivos**, en el caso contrario puede pedirle al bot que le busque su parada más cercana usando su ubicación actual. Esto último hace que pierda sentido el punto de usar menos datos.|
|||

## Lista de comandos

Para ejecutar un comando debe estar acompañado por el prefijo **"."** *(punto)* seguido del alias del comando *(sin espacio)* y los parámetros *(estos sí espaciados)*.

|Alias|Sintaxis|Función|Ejemplo|
|:---:|:---|:---:|:---|
|**micro<br>m**|micro *[número de micro]* *[número de parada]*|Obtener los horarios de **un colectivo** en una parada.|.micro **120** **M14408**<br>(La "M" es opcional)|
|**parada<br>p**|parada *[número de parada]*|Obtener **todos** los horarios de una parada de colectivos.|.parada **M5707**<br>(La "M" es opcional)|
|**help<br>?**|help *[comando]*|Solicitar información sobre el uso de un comando.|.help **micro**|
|||||

También existe la alternativa de localizar una parada por cercanía. Tan solo basta con enviar una ubicación, citarla y utilizar alguno de los comandos. [Vea el ejemplo](#usando-tu-ubicación).

## Cosas por hacer

Lejos de ser este el estado final del proyecto, aún hay cosas que tengo pensadas implementar en un futuro. Si lo desea y tiene las habilidades para hacerlo puede contribuir al mismo.

- [ ] Buscar estaciones de metro-tranvía por nombre.
- [ ] Almacenar paradas por nombre. Que el usuario pueda guardar una parada / micro por nombre, por ejemplo: "casa", entonces para saber los horarios del colectivo que pasa por su casa solo basta escribir ".micro casa" o ".parada casa".
- [ ] Comando para buscar paradas en cierto radio respecto a una ubicación. Permite elegir la parada de la cual se desea saber sus horarios.