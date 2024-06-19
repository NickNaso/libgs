# libgs

**libsg** is a ...

## This module is under development yet :-) 
### It will be a long process end this project and every help will be welcome
### Give me other time i work with :heart: for all of you

* [Introduction](#introduction)
* [Supported platforms](#supported_platforms)
* [Installation](#install)
* [Usage](#usage)
* [Code of conduct](CODE_OF_CONDUCT.md)
* [Team](#team)
* [Acknowledgements](#acknowledgements)
* [License](#license)

<a name="introduction"></a>

## Introduction

libgs is a Node.js wrapper for Ghostscript. It makes it easy to run Ghostscript from Node.js.

Ghostscript is a tool for handling and manipulating PostScript and PDF files. It is open source and has been around for a long time. It is written in C and is one of the most widely-used tools for handling PDF files.

libgs is a wrapper for Ghostscript that makes it easy to use from Node.js. It provides a simple API that allows you to run Ghostscript with the same arguments that you would use from the command line.

libgs is great for handling PDF files on the server side. You can use it to convert PDF files to other formats, extract text from PDF files, and more.

### What is libgs


**libgs** is a Node.js wrapper for Ghostscript. It provides a simple API to run Ghostscript from Node.js with the same arguments that you would use from the command line. 

It is great for handling PDF files on the server side. You can use it to convert PDF files to other formats, extract text from PDF files, and more. 


<a name="supported_platforms">

## Supported platforms


The following platforms are supported:

- Linux(x64,arm64,armv7)/musl
- MacOS(aarch64,x64)
- Windows(x64,x86)

<a name="install"></a>

## Installation

```sh
git clone https://github.com/NickNaso/libgs.git
cd libgs 
npm i 
```

<a name="usage"></a>

## Usage

```
node index.js -a aarch64 -p darwin # this make index.js compile for aarch64 darwin
npm makePackages # this populates the npm/@libgs directory with all platforms
npm clean # cleans the current projects
```

<a name="team"></a>

## The Team

### Nicola Del Gobbo

<https://github.com/NickNaso/>

<https://www.npmjs.com/~nicknaso>

<https://twitter.com/NickNaso>

### Simone Russo

<https://github.com/ErRusso>

<a name="acknowledgements"></a>

## Acknowledgements

Thank you to all people that encourage me every day.

<a name="license"></a>

## License

Licensed under [Apache license V2](./LICENSE)
