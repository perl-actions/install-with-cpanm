[![Actions Status](https://github.com/perl-actions/install-cpanm/workflows/check/badge.svg)](https://github.com/perl-actions/install-cpanm/actions)

# install-cpanm

GitHub action to install App::cpanminus

This action installs 'cpanminus' as root so you can then use it in your workflow.

## Inputs

none

## Outputs

none

## Example usage

```
uses: perl-actions/install-cpanm@v1.0
run: |
   sudo cpanm Module::To::Install
```
