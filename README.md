[![Actions Status](https://github.com/perl-actions/install-with-cpanm/workflows/check/badge.svg)](https://github.com/perl-actions/install-with-cpanm/actions)

# install-with-cpanm

GitHub action to install Perl Modules [App::cpanminus](https://github.com/miyagawa/cpanminus)

This action installs 'cpanminus' then use it if needed to install some Perl Modules.

```yaml
- name: install cpanm and multiple modules
  uses: perl-actions/install-with-cpanm@stable
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
```

## Using install-with-cpanm in a GitHub workflow

Here is a sample integration using install-with-cpanm action
to test your Perl Modules using multiple Perl versions via the
perl-tester images.

```yaml
# .github/workflows/linux.yml
jobs:
  perl_tester:
    runs-on: ubuntu-latest
    name: "perl v${{ matrix.perl-version }}"

    strategy:
      fail-fast: false
      matrix:
        perl-version:
          - "5.30"
          - "5.28"
          - "5.26"
        # ...
        # - '5.8'

    container:
      image: perldocker/perl-tester:${{ matrix.perl-version }}

    steps:
      - uses: actions/checkout@v3
      - name: uses install-with-cpanm
        uses: perl-actions/install-with-cpanm@stable
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

    - uses: actions/checkout@v3
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
