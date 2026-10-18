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

The library is built for the [platforms of Node.js][Node.js platforms] that
Ghostscript can be built for, with the minimum versions Node.js requires:

|                   | x86 | x64 | armv6 | armv7 | arm64 | ppc64le | s390x | loong64 | riscv64 |
| ----------------- | --- | --- | ----- | ----- | ----- | ------- | ----- | ------- | ------- |
| Windows           | ✅  | ✅  |       |       | ✅    |         |       |         |         |
| macOS >= 13.5     |     | ✅  |       |       | ✅    |         |       |         |         |
| Linux glibc       | ✅  | ✅  | ✅    | ✅    | ✅    | ✅      | ✅    | ✅      | ✅      |
| Linux musl        |     | ✅  | ✅    | ✅    | ✅    |         |       |         |         |
| FreeBSD           |     | ✅  |       |       |       |         |       |         |         |

The Linux glibc libraries require glibc 2.17 on x86, 2.28 on armv6 and
armv7, 2.36 on loong64 and riscv64 and 2.34 on the other architectures.

Three platforms of Node.js are missing: SmartOS and AIX, for which there is
neither a cross-compiler nor a GitHub Actions runner, and OpenHarmony, which
needs the OpenHarmony SDK.

### Packages

- [@libgs/darwin-aarch64][]
- [@libgs/darwin-x64][]
- [@libgs/freebsd-x64][]
- [@libgs/linux-arm64][]
- [@libgs/linux-armv6][]
- [@libgs/linux-armv7][]
- [@libgs/linux-ia32][]
- [@libgs/linux-loong64][]
- [@libgs/linux-ppc64][] (ppc64le)
- [@libgs/linux-riscv64][]
- [@libgs/linux-s390x][]
- [@libgs/linux-x64][]
- [@libgs/linux-musl-arm64][]
- [@libgs/linux-musl-armv6][]
- [@libgs/linux-musl-armv7][]
- [@libgs/linux-musl-x64][]
- [@libgs/win32-arm64][]
- [@libgs/win32-x64][]
- [@libgs/win32-x86][]

<a name="install"></a>

## Installation

### Download pre-compiled binary

You can download the pre-compiled binary for each version from the [release][] page,
or you can do npm install <package-name> es. `npm install @libgs/win32-x64`

The npm packages contain the libraries, in their `lib` directory, and the
headers of the Ghostscript API (`iapi.h`, `ierrors.h`, `gserrors.h` and
`gdevdsp.h`), in their `include` directory, and have no install scripts. Like [esbuild][]'s platform packages, they declare their
`os`, `cpu` and `libc`, so npm only installs the package matching the
system.

### Create the npm packages

Publishing a GitHub release builds the libraries and uploads the archives,
named `gs-<platform>-<arch>.tar.gz` after the packages, to the release. Then

```sh
npm run makePackages                        # from the latest release
npm run makePackages -- --tag v0.0.14       # from a given release
```

downloads the archives of the release, checks their size and SHA-256 digest
and creates a package in `npm/@libgs` for each archive, with the version of
the release (`--version` sets another one). Platforms without an archive in
the release are skipped. Set `GITHUB_TOKEN` if the GitHub API rate limit is
reached.

### Compile from source

If you want to compile the library from source, you can do it with `npm start`

### Cross-compile with Zig

On Linux, with [Zig][] 0.16 on the `PATH`, you can cross-compile for Linux
and FreeBSD. The Linux and FreeBSD libraries of the releases are built this
way:

```sh
node index.js -z aarch64-linux-musl
node index.js -z riscv64-linux-gnu.2.36
node index.js -z x86_64-linux-gnu.2.34   # require glibc 2.34 or later
node index.js -z armv6-linux-musleabihf  # Raspberry Pi 1 and Zero
node index.js -z x86_64-freebsd
```

The archive is named after the package, e.g. `gs-linux-musl-arm64.tar.gz`.
For 32-bit ARM the target architecture can be `armv6` or `armv7` (`arm` is
the same as `armv7`).

### Compile for Windows

In a Visual Studio developer prompt of the target architecture (`vcvarsall
x64`, `vcvarsall amd64_x86` or `vcvarsall arm64`), run
`node index.js -p windows -a <x64|x86|arm64>`: the Ghostscript makefile
builds for the architecture of the compiler on the `PATH`.

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
[Zig]: https://ziglang.org/download/
[esbuild]: https://esbuild.github.io/getting-started/#install-esbuild
[Node.js platforms]: https://github.com/nodejs/node/blob/main/BUILDING.md#platform-list
[@libgs]: https://www.npmjs.com/org/libgs
[@libgs/darwin-aarch64]: https://www.npmjs.com/package/@libgs/darwin-aarch64
[@libgs/darwin-x64]: https://www.npmjs.com/package/@libgs/darwin-x64
[@libgs/freebsd-x64]: https://www.npmjs.com/package/@libgs/freebsd-x64
[@libgs/linux-armv6]: https://www.npmjs.com/package/@libgs/linux-armv6
[@libgs/linux-armv7]: https://www.npmjs.com/package/@libgs/linux-armv7
[@libgs/linux-arm64]: https://www.npmjs.com/package/@libgs/linux-arm64
[@libgs/linux-ia32]: https://www.npmjs.com/package/@libgs/linux-ia32
[@libgs/linux-loong64]: https://www.npmjs.com/package/@libgs/linux-loong64
[@libgs/linux-ppc64]: https://www.npmjs.com/package/@libgs/linux-ppc64
[@libgs/linux-riscv64]: https://www.npmjs.com/package/@libgs/linux-riscv64
[@libgs/linux-s390x]: https://www.npmjs.com/package/@libgs/linux-s390x
[@libgs/linux-x64]: https://www.npmjs.com/package/@libgs/linux-x64
[@libgs/linux-musl-armv6]: https://www.npmjs.com/package/@libgs/linux-musl-armv6
[@libgs/linux-musl-armv7]: https://www.npmjs.com/package/@libgs/linux-musl-armv7
[@libgs/linux-musl-arm64]: https://www.npmjs.com/package/@libgs/linux-musl-arm64
[@libgs/linux-musl-x64]: https://www.npmjs.com/package/@libgs/linux-musl-x64
[@libgs/win32-arm64]: https://www.npmjs.com/package/@libgs/win32-arm64
[@libgs/win32-x86]: https://www.npmjs.com/package/@libgs/win32-x86
[@libgs/win32-x64]: https://www.npmjs.com/package/@libgs/win32-x64