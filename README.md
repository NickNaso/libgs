# libgs

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

Ghoscript and its dependencies are provided as pre-compiled static libraries
named **libgs**. The library is avalable for the most common operating systems
and cpu architectures.

The libraries ara distributed through the [release][] or the npm registry under
[@libgs][] organisation.

<a name="supported_platforms">

## Supported platforms

The following platforms are supported:

|                              | x86    | x64    | armv6  | armv7  | arm64  | 
| ---------------------------- | ------ | ------ | ------ | ------ | ------ |
| Windows                      | ✅     | ✅    |        |        |        |
| macOS                        |        | ✅     |        |        | ✅    |
| Linux gnu (glibc)            |        | ✅     | ✅    | ✅     | ✅    |
| Linux  musl                  |        | ✅     | ✅    | ✅     | ✅    |

### Packages

- [@libgs/darwin-aarch64][]
- [@libgs/darwin-x64][]
- [@libgs/linux-armv7][]
- [@libgs/linux-amr64][]
- [@libgs/linux-x64][]
- [@libgs/linux-musl-armv7][]
- [@libgs/linux-musl-arm64][]
- [@libgs/linux-musl-x64][]
- [@libgs/win32-x64][]
- [@libgs/win32-x86][]

<a name="install"></a>

## Installation

### Download pre-compiled binary

You can download the pre-compiled binary for each version from the [release][] page,
or you can do npm install <package-name> es. `npm install win32-x64`

### Compile from source

If you want to compile the library from source, you can do it with `npm start`

<a name="usage"></a>

## Usage

// Describe how to use one of the package


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

[release]: https://github.com/NickNaso/libgs/releases
[@libgs]: https://www.npmjs.com/org/libgs
[@libgs/darwin-aarch64]: https://www.npmjs.com/package/@libgs/darwin-aarch64
[@libgs/darwin-x64]: https://www.npmjs.com/package/@libgs/darwin-x64
[@libgs/linux-armv7]: https://www.npmjs.com/package/@libgs/linux-armv7
[@libgs/linux-amr64]: https://www.npmjs.com/package/@libgs/linux-arm64
[@libgs/linux-x64]: https://www.npmjs.com/package/@libgs/linux-x64
[@libgs/linux-musl-armv7]: https://www.npmjs.com/package/@libgs/linux-musl-x64
[@libgs/linux-musl-arm64]: https://www.npmjs.com/package/@libgs/linux-musl-amr64
[@libgs/linux-musl-x64]: https://www.npmjs.com/package/@libgs/linux-musl-armv7
[@libgs/win32-x86]: https://www.npmjs.com/package/@libgs/win32-x86
[@libgs/win32-x64]: https://www.npmjs.com/package/@libgs/win32-x84