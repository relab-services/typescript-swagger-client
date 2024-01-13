# @sergeyzwezdin/typescript-swagger-client

Utility package to generate typescript client by Swagger/OpenAPI definition.

## Usage

1. `npm install --save-dev @sergeyzwezdin/typescript-swagger-client`
2. Add command to `scripts` section of `package.json` file
```json
{
  "name": "my-app",
  "scripts": {
    "swagger-client": "typescript-swagger-client --input @api/api.generated.json --output @api/generated"
  }
}
```
3. `npm run swagger-client`

Parameters of `typescript-swagger-client`:
- `--input` - JSON-file path in your project that contains OpenAPI definition
- `--output` - Folder for generated code

## License

Released under [MIT](/LICENSE) by [Sergey Zwezdin](https://github.com/sergeyzwezdin).
