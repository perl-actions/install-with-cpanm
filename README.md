[![Actions Status](https://github.com/perl-actions/install-with-cpanm/workflows/check/badge.svg)](https://github.com/perl-actions/install-with-cpanm/actions) [![Lint javascript](https://github.com/perl-actions/install-with-cpanm/actions/workflows/lint-javascript.yml/badge.svg)](https://github.com/perl-actions/install-with-cpanm/actions/workflows/lint-javascript.yml)

# install-with-cpanm

GitHub action to install Perl Modules [App::cpanminus](https://github.com/miyagawa/cpanminus)

This action installs 'cpanminus' then use it if needed to install some Perl Modules.

```yaml
- name: install cpanm and multiple modules
  uses: perl-actions/install-with-cpanm@v1
  with:
    install: |
      Simple::Accessor
      Test::Parallel

# or you can use a cpanfile
#     cpanfile: 'your-cpanfile'
# default values you can customize
#     sudo: true
# where to install cpanm
#     path: "$Config{installsitescript}/cpanm"
# which perl binary to use
#     perl: 'perl'
# Use a local library
#     local-lib: ~/perl5
```

## Using install-with-cpanm in a GitHub workflow

Here is a sample integration using `install-with-cpanm` action
to test your Perl Modules using multiple Perl versions via the
`perl-tester` images and the action `perl-actions/perl-versions` to rely on a dynamic list of available Perl versions.

```yaml
# .github/workflows/testsuite.yml
jobs:

  perl-versions:
    runs-on: ubuntu-latest
    name: List Perl versions
    outputs:
      perl-versions: ${{ steps.action.outputs.perl-versions }}
    steps:
      - id: action
        uses: perl-actions/perl-versions@v1
        with:
          since-perl: v5.10
          with-devel: true

  perl_tester:
    runs-on: ubuntu-latest
    name: "Perl ${{ matrix.perl-version }}"
    needs: [perl-versions]

    strategy:
      fail-fast: false
      matrix:
        perl-version: ${{ fromJson (needs.perl-versions.outputs.perl-versions) }}

    container: perldocker/perl-tester:${{ matrix.perl-version }}

    steps:
      - uses: actions/checkout@v4
      - name: uses install-with-cpanm
        uses: perl-actions/install-with-cpanm@v1
        with:
          cpanfile: "cpanfile"
          sudo: false
      - run: perl Makefile.PL
      - run: make test
```

## Inputs

### `install`

List of one or more modules, separated by a newline `\n` character.

### `cpanfile`

Install modules from a cpanfile.

### `tests`

Boolean variable used to disable unit tests during installation
Possible values: true | false [default: false]

### `verbose`

Boolean variable used to control the `-v` flag
Possible values: true | false [default: false]

Note: this was previously set to true by default,
this is now disabled to speedup installations.

### `args`

Extra arguments to pass to the cpanm command line used by `install` or `cpanfile`.

example:
```yaml
args: "-L vendor"
```

You can also use this option to run your own flavor
without the need of setting `install` or `cpanfile`.
```yaml
args: "--installdeps ."
```

### `sudo`

Run commands as sudo: true | false [default: true]

### `perl`

Which perl path to use. Default to use `perl` from the current `PATH`.
By setting PATH correctly you probably do not need to use it.

### `path`

Where to install `cpanm`. Default value is `$Config{installsitescript}/cpanm`.
You can use any `$Config` variable in your string.

### `local-lib`

Local (user space) library where `cpanm` will install the distributions. Use
this for caching, for instance.

## Outputs

none

## Example usage

### Install cpanm and use it manually later

```yaml
uses: perl-actions/install-with-cpanm@stable
# you can then use it later
run: sudo cpanm Module::To::Install
```

but you should prefer let the action install your modules

### Install cpanm and a single module

```yaml
- name: install cpanm and one module
  uses: perl-actions/install-with-cpanm@stable
  with:
    install: "Simple::Accessor"
```

### Install cpanm and multiple modules

```yaml
- name: install cpanm and one module
  uses: perl-actions/install-with-cpanm@stable
  with:
    install: |
      Simple::Accessor
      Test::Parallel
```

### Install modules from a cpanfile

```yaml
- name: install cpanm and files from cpanfile
  uses: perl-actions/install-with-cpanm@stable
  with:
    cpanfile: "your-cpanfile"
```

### Install a module and enable tests

Install modules with tests.

```yaml
- name: install cpanm and files from cpanfile
  uses: perl-actions/install-with-cpanm@stable
  with:
    install: "Simple::Accessor"
    tests: true
```

### Using install-with-cpanm on Windows / win32

Here is a sample job using cpanm to install modules on windows.

```yaml
windows:
  runs-on: windows-latest
  name: "windows"

  steps:
    - name: Set up Perl
      run: |
        choco install strawberryperl
        echo "##[add-path]C:\strawberry\c\bin;C:\strawberry\perl\site\bin;C:\strawberry\perl\bin"

    - name: perl -V
      run: perl -V

    - uses: actions/checkout@v4
    - name: "install-with-cpanm"
      uses: perl-actions/install-with-cpanm@stable
      with:
        install: |
          abbreviation
          ACH
    # checking that both modules are installed
    - run: perl -Mabbreviation -e1
    - run: perl -MACH -e1
```

### Using install-with-cpanm for installation in local library

```yaml
  local_lib:
    runs-on: ubuntu-latest
    name: 'local-lib'

    steps:
      - uses: actions/checkout@v4
      - name: 'install-with-cpanm'
        uses: ./
        with:
          install: 'Simple::Accessor'
          local-lib: '~/perl5'
          sudo: false
          verbose: true
```


## License

Copyright (c) 2022-2024, Atoomic, Olaf Alders, haarg, Brian C. Arnold, mohawk2

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
