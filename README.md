# Quickstart

## Description

The goal here is simple: mixing python & nodejs lambdas in a serverless project.  
Of courses lambdas will land in subfolders because we are organized people 😎.

At start it's simple. But, well. Javascripters does not like Python that much it seems...

## Dev

Deploy & test invokes

```sh
sls deploy -v && sls invoke -f pyfunc --log && sls invoke -f tsfunc --log

sls invoke local -f pyfunc --log && \
sls invoke local -f tsfunc --log && \
sls invoke -f pyfunc --log && \
sls invoke -f tsfunc --log
```

Manually run the TS lambda

```sh
npx ts-node-dev lambdas/tsfunc/handler.ts
```

Manually run the Python lambda

```sh
virtualenv venv --python=python3
source venv/bin/activate
pip install -r requirements.txt
python handler.py
```

## Notes

### Getting dependencies in the remote lambda

Tricks for getting python lambda to work with it's dependencies is to **have the `requirements.txt` at root** of the folder.  
This way serverless-python-requirements will bundle the dependencies with the lambdas zip

### Getting invoke local for python to work

```sh
sls invoke local -f pyfunc --log
```

To enable sls invoke for local python lambdas **we need to have a venv enabled**

```sh
virtualenv venv --python=python3
source venv/bin/activate
pip install -r requirements.txt
python handler.py
```

The venv folder **must be excluded @package level** to lower the bundle size

```yaml
package:
  individually: true
  exclude:
    - lambdas/pyfunc/venv/**
    - lambdas/pyfunc/__pycache__/**
```

#### serverless-plugin-typescript mess

- serverless-plugin-typescript does not support mixing python and node lambdas.  

> @see https://github.com/prisma-labs/serverless-plugin-typescript/pull/196  

- Somebody forked the repo: [https://github.com/KingDarBoja/serverless-plugin-typescript]('@kingdarboja/serverless-plugin-typescript')

But the build process breaks serverless-python-requirements. Dependencies ends in the zip, but lambdas files does not.

Probaly because of the overwrite of the [this.serverless.config.servicePath](https://github.com/KingDarBoja/serverless-plugin-typescript/blob/master/src/index.ts#L173)

> @see [tsplugin-index](./tsplugin-index) (manually edited node_modules/@kingdarboja/serverless-plugin-typescript for debugging purposes)

**Solution** is to transpile ts files manually and leave them in the lambda folder **before** running `sls package/deploy`