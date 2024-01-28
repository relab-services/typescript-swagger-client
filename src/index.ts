#! /usr/bin/env node
import * as fs from 'fs/promises'
import * as path from 'path'

import { Command } from 'commander'
import camelCase from 'lodash/camelCase'
import process from 'process'
import { generateApi } from 'swagger-typescript-api'

import pkg from '../package.json'

type Paths = {
    input: string
    output: string
    templates: string
}

const options = new Command()
    .name(Object.keys(pkg.bin)[0])
    .description(pkg.description)
    .version(pkg.version)
    .requiredOption('-i, --input <input>', 'Open API JSON manifest')
    .requiredOption('-o, --output <input>', 'Folder for generated code')
    .parse()
    .opts<{ input: string; output: string }>()

void (async function () {
    const paths: Paths = {
        input: path.resolve(process.cwd(), options.input),
        output: path.resolve(process.cwd(), options.output),
        templates: path.resolve(__dirname, 'templates'),
    }

    await cleanup(paths.output, [paths.input])

    await generate(paths)

    await banner(
        (
            await fs.readdir(paths.output, {
                recursive: true,
                withFileTypes: true,
            })
        )
            .filter(x => x.isFile() && path.relative(path.resolve(paths.output, x.name), paths.input))
            .map(({ name }) => path.resolve(paths.output, name))
    )
})()

async function cleanup(folder: string, skip: string[]) {
    const content = await fs.readdir(folder, { withFileTypes: true })
    for (const item of content) {
        const fullPath = path.resolve(folder, item.name)
        const shouldSkip = skip.some(s => !path.relative(fullPath, s))

        if (!shouldSkip) {
            await fs.rm(fullPath, { recursive: true })
        }
    }
}

async function generate(paths: Paths) {
    await generateApi({
        name: 'api.ts',
        output: paths.output,
        input: paths.input,
        templates: paths.templates,
        httpClientType: 'axios',
        defaultResponseAsSuccess: false,
        generateClient: true,
        generateRouteTypes: false,
        generateResponses: true,
        toJS: false,
        extractRequestParams: false,
        extractRequestBody: false,
        extractEnums: false,
        unwrapResponseData: true,
        defaultResponseType: 'void',
        singleHttpClient: true,
        cleanOutput: false,
        enumNamesAsValues: false,
        moduleNameFirstTag: true,
        generateUnionEnums: true,
        typePrefix: '',
        typeSuffix: '',
        enumKeyPrefix: '',
        enumKeySuffix: '',
        addReadonly: false,
        sortTypes: true,
        fixInvalidTypeNamePrefix: 'Type',
        fixInvalidEnumKeyPrefix: 'Value',
        modular: true,
        prettier: undefined,
        silent: false,

        extraTemplates: [
            {
                name: 'routes',
                path: path.resolve(paths.templates, 'routes.ejs'),
            },
        ],

        hooks: {
            onParseSchema: (
                originalSchema: { type: string; format: string },
                parsedSchema: {
                    $ref?: string
                    name?: string
                    content:
                        | string
                        | {
                              name: string
                              nullable?: boolean
                              isNullable?: boolean
                              value?: string
                              field?: string
                          }[]
                    required?: string[]
                    properties?: Record<
                        string,
                        {
                            nullable?: boolean
                            $parsed: {
                                nullable?: boolean
                                content?: string
                            }
                        }
                    >
                }
            ) => {
                if (originalSchema.type === 'string' && ['date-time', 'date'].includes(originalSchema.format)) {
                    parsedSchema.content = 'Date'
                }

                // Workaround to get rid of `null` type for nullable types
                if (parsedSchema.properties) {
                    for (const [propertyName, propertyDefinition] of Object.entries(parsedSchema.properties)) {
                        if (propertyDefinition.nullable !== undefined) {
                            delete propertyDefinition.nullable
                        }

                        if (Array.isArray(parsedSchema.content)) {
                            const parsedProperty = parsedSchema.content.find(x => x.name.replace(/['"]+/g, '') === propertyName)

                            if (parsedProperty) {
                                parsedProperty.nullable = false
                                parsedProperty.isNullable = false
                                if (parsedProperty.value)
                                    parsedProperty.value = parsedProperty.value
                                        .replace(/\|\s+null/i, '')
                                        .replace(/null\s+\|/i, '')
                                        .trim()
                                if (parsedProperty.field)
                                    parsedProperty.field = parsedProperty.field
                                        .replace(/\|\s+null/i, '')
                                        .replace(/null\s+\|/i, '')
                                        .trim()
                            }
                        }
                    }
                }

                return parsedSchema
            },
            onFormatRouteName: routeInfo => {
                // customize method names in clients
                const segments = routeInfo.operationId.split('.')
                return camelCase(segments[segments.length - 1])
            },
            onFormatTypeName: (typeName, rawTypeName, schemaType) =>
                // customize DTO names
                schemaType === 'type-name'
                    ? 'Dto.' +
                      rawTypeName
                          ?.replace(/\W+/gi, '.')
                          .replace(/\.$/gi, '')
                          .replace(/\.(\d+?)\./g, 'T$1')
                    : typeName,
        },
    }).then(({ files }) => {
        console.log(`👌 Generated ${files.length} file(s)`)
    })
}

async function banner(files: string[]) {
    const banner = `/**
 * Generated by typescript-swagger-client
 * - https://github.com/sergeyzwezdin/typescript-swagger-client
 * - https://github.com/acacode/swagger-typescript-api
 */

/* eslint-disable */
/* tslint:disable */

`

    for (const file of files) {
        let content = await fs.readFile(file, { encoding: 'utf-8' })

        content = content.replace(/^[/ ]\*.*?$/gm, '').trim()
        content = banner + content

        await fs.writeFile(file, content, { encoding: 'utf-8' })
    }
}
