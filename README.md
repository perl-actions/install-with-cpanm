[![Actions Status](https://github.com/perl-actions/install-with-cpanm/workflows/check/badge.svg)](https://github.com/perl-actions/install-with-cpanm/actions)

# install-with-cpanm

GitHub action to install Perl Modules App::cpanminus

This action installs 'cpanminus' as root so you can then use it in your workflow.

## Inputs

none

## Outputs

none

## Example usage

```
uses: perl-actions/install-with-cpanm@v1.0
run: |
   sudo cpanm Module::To::Install
```
