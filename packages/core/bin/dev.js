#!/usr/bin/env -S node --loader ts-node/esm --disable-warning=ExperimentalWarning

<<<<<<< HEAD
import { execute } from "@oclif/core";

await execute({ development: true, dir: import.meta.url });
=======
import {execute} from '@oclif/core'

await execute({development: true, dir: import.meta.url})
>>>>>>> 4d48d5e (Initialize CLI)
