
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model Cliente
 * 
 */
export type Cliente = $Result.DefaultSelection<Prisma.$ClientePayload>
/**
 * Model Produto
 * 
 */
export type Produto = $Result.DefaultSelection<Prisma.$ProdutoPayload>
/**
 * Model Venda
 * 
 */
export type Venda = $Result.DefaultSelection<Prisma.$VendaPayload>
/**
 * Model Documento
 * 
 */
export type Documento = $Result.DefaultSelection<Prisma.$DocumentoPayload>
/**
 * Model ItemVenda
 * 
 */
export type ItemVenda = $Result.DefaultSelection<Prisma.$ItemVendaPayload>
/**
 * Model ParcelaVencimento
 * 
 */
export type ParcelaVencimento = $Result.DefaultSelection<Prisma.$ParcelaVencimentoPayload>
/**
 * Model Config
 * 
 */
export type Config = $Result.DefaultSelection<Prisma.$ConfigPayload>
/**
 * Model Usuario
 * 
 */
export type Usuario = $Result.DefaultSelection<Prisma.$UsuarioPayload>
/**
 * Model Fornecedor
 * 
 */
export type Fornecedor = $Result.DefaultSelection<Prisma.$FornecedorPayload>
/**
 * Model EmpresaParceira
 * 
 */
export type EmpresaParceira = $Result.DefaultSelection<Prisma.$EmpresaParceiraPayload>
/**
 * Model Pagamento
 * 
 */
export type Pagamento = $Result.DefaultSelection<Prisma.$PagamentoPayload>
/**
 * Model AuditLog
 * 
 */
export type AuditLog = $Result.DefaultSelection<Prisma.$AuditLogPayload>
/**
 * Model Despesa
 * 
 */
export type Despesa = $Result.DefaultSelection<Prisma.$DespesaPayload>
/**
 * Model Aviso
 * 
 */
export type Aviso = $Result.DefaultSelection<Prisma.$AvisoPayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Clientes
 * const clientes = await prisma.cliente.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Clientes
   * const clientes = await prisma.cliente.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.cliente`: Exposes CRUD operations for the **Cliente** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Clientes
    * const clientes = await prisma.cliente.findMany()
    * ```
    */
  get cliente(): Prisma.ClienteDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.produto`: Exposes CRUD operations for the **Produto** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Produtos
    * const produtos = await prisma.produto.findMany()
    * ```
    */
  get produto(): Prisma.ProdutoDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.venda`: Exposes CRUD operations for the **Venda** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Vendas
    * const vendas = await prisma.venda.findMany()
    * ```
    */
  get venda(): Prisma.VendaDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.documento`: Exposes CRUD operations for the **Documento** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Documentos
    * const documentos = await prisma.documento.findMany()
    * ```
    */
  get documento(): Prisma.DocumentoDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.itemVenda`: Exposes CRUD operations for the **ItemVenda** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ItemVendas
    * const itemVendas = await prisma.itemVenda.findMany()
    * ```
    */
  get itemVenda(): Prisma.ItemVendaDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.parcelaVencimento`: Exposes CRUD operations for the **ParcelaVencimento** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ParcelaVencimentos
    * const parcelaVencimentos = await prisma.parcelaVencimento.findMany()
    * ```
    */
  get parcelaVencimento(): Prisma.ParcelaVencimentoDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.config`: Exposes CRUD operations for the **Config** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Configs
    * const configs = await prisma.config.findMany()
    * ```
    */
  get config(): Prisma.ConfigDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.usuario`: Exposes CRUD operations for the **Usuario** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Usuarios
    * const usuarios = await prisma.usuario.findMany()
    * ```
    */
  get usuario(): Prisma.UsuarioDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.fornecedor`: Exposes CRUD operations for the **Fornecedor** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Fornecedors
    * const fornecedors = await prisma.fornecedor.findMany()
    * ```
    */
  get fornecedor(): Prisma.FornecedorDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.empresaParceira`: Exposes CRUD operations for the **EmpresaParceira** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more EmpresaParceiras
    * const empresaParceiras = await prisma.empresaParceira.findMany()
    * ```
    */
  get empresaParceira(): Prisma.EmpresaParceiraDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.pagamento`: Exposes CRUD operations for the **Pagamento** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Pagamentos
    * const pagamentos = await prisma.pagamento.findMany()
    * ```
    */
  get pagamento(): Prisma.PagamentoDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.auditLog`: Exposes CRUD operations for the **AuditLog** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AuditLogs
    * const auditLogs = await prisma.auditLog.findMany()
    * ```
    */
  get auditLog(): Prisma.AuditLogDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.despesa`: Exposes CRUD operations for the **Despesa** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Despesas
    * const despesas = await prisma.despesa.findMany()
    * ```
    */
  get despesa(): Prisma.DespesaDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.aviso`: Exposes CRUD operations for the **Aviso** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Avisos
    * const avisos = await prisma.aviso.findMany()
    * ```
    */
  get aviso(): Prisma.AvisoDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.19.2
   * Query Engine version: c2990dca591cba766e3b7ef5d9e8a84796e47ab7
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    Cliente: 'Cliente',
    Produto: 'Produto',
    Venda: 'Venda',
    Documento: 'Documento',
    ItemVenda: 'ItemVenda',
    ParcelaVencimento: 'ParcelaVencimento',
    Config: 'Config',
    Usuario: 'Usuario',
    Fornecedor: 'Fornecedor',
    EmpresaParceira: 'EmpresaParceira',
    Pagamento: 'Pagamento',
    AuditLog: 'AuditLog',
    Despesa: 'Despesa',
    Aviso: 'Aviso'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "cliente" | "produto" | "venda" | "documento" | "itemVenda" | "parcelaVencimento" | "config" | "usuario" | "fornecedor" | "empresaParceira" | "pagamento" | "auditLog" | "despesa" | "aviso"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      Cliente: {
        payload: Prisma.$ClientePayload<ExtArgs>
        fields: Prisma.ClienteFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ClienteFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClientePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ClienteFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClientePayload>
          }
          findFirst: {
            args: Prisma.ClienteFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClientePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ClienteFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClientePayload>
          }
          findMany: {
            args: Prisma.ClienteFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClientePayload>[]
          }
          create: {
            args: Prisma.ClienteCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClientePayload>
          }
          createMany: {
            args: Prisma.ClienteCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ClienteCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClientePayload>[]
          }
          delete: {
            args: Prisma.ClienteDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClientePayload>
          }
          update: {
            args: Prisma.ClienteUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClientePayload>
          }
          deleteMany: {
            args: Prisma.ClienteDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ClienteUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ClienteUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClientePayload>[]
          }
          upsert: {
            args: Prisma.ClienteUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ClientePayload>
          }
          aggregate: {
            args: Prisma.ClienteAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCliente>
          }
          groupBy: {
            args: Prisma.ClienteGroupByArgs<ExtArgs>
            result: $Utils.Optional<ClienteGroupByOutputType>[]
          }
          count: {
            args: Prisma.ClienteCountArgs<ExtArgs>
            result: $Utils.Optional<ClienteCountAggregateOutputType> | number
          }
        }
      }
      Produto: {
        payload: Prisma.$ProdutoPayload<ExtArgs>
        fields: Prisma.ProdutoFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ProdutoFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProdutoPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ProdutoFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProdutoPayload>
          }
          findFirst: {
            args: Prisma.ProdutoFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProdutoPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ProdutoFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProdutoPayload>
          }
          findMany: {
            args: Prisma.ProdutoFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProdutoPayload>[]
          }
          create: {
            args: Prisma.ProdutoCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProdutoPayload>
          }
          createMany: {
            args: Prisma.ProdutoCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ProdutoCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProdutoPayload>[]
          }
          delete: {
            args: Prisma.ProdutoDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProdutoPayload>
          }
          update: {
            args: Prisma.ProdutoUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProdutoPayload>
          }
          deleteMany: {
            args: Prisma.ProdutoDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ProdutoUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ProdutoUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProdutoPayload>[]
          }
          upsert: {
            args: Prisma.ProdutoUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProdutoPayload>
          }
          aggregate: {
            args: Prisma.ProdutoAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateProduto>
          }
          groupBy: {
            args: Prisma.ProdutoGroupByArgs<ExtArgs>
            result: $Utils.Optional<ProdutoGroupByOutputType>[]
          }
          count: {
            args: Prisma.ProdutoCountArgs<ExtArgs>
            result: $Utils.Optional<ProdutoCountAggregateOutputType> | number
          }
        }
      }
      Venda: {
        payload: Prisma.$VendaPayload<ExtArgs>
        fields: Prisma.VendaFieldRefs
        operations: {
          findUnique: {
            args: Prisma.VendaFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VendaPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.VendaFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VendaPayload>
          }
          findFirst: {
            args: Prisma.VendaFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VendaPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.VendaFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VendaPayload>
          }
          findMany: {
            args: Prisma.VendaFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VendaPayload>[]
          }
          create: {
            args: Prisma.VendaCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VendaPayload>
          }
          createMany: {
            args: Prisma.VendaCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.VendaCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VendaPayload>[]
          }
          delete: {
            args: Prisma.VendaDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VendaPayload>
          }
          update: {
            args: Prisma.VendaUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VendaPayload>
          }
          deleteMany: {
            args: Prisma.VendaDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.VendaUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.VendaUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VendaPayload>[]
          }
          upsert: {
            args: Prisma.VendaUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VendaPayload>
          }
          aggregate: {
            args: Prisma.VendaAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateVenda>
          }
          groupBy: {
            args: Prisma.VendaGroupByArgs<ExtArgs>
            result: $Utils.Optional<VendaGroupByOutputType>[]
          }
          count: {
            args: Prisma.VendaCountArgs<ExtArgs>
            result: $Utils.Optional<VendaCountAggregateOutputType> | number
          }
        }
      }
      Documento: {
        payload: Prisma.$DocumentoPayload<ExtArgs>
        fields: Prisma.DocumentoFieldRefs
        operations: {
          findUnique: {
            args: Prisma.DocumentoFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentoPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.DocumentoFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentoPayload>
          }
          findFirst: {
            args: Prisma.DocumentoFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentoPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.DocumentoFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentoPayload>
          }
          findMany: {
            args: Prisma.DocumentoFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentoPayload>[]
          }
          create: {
            args: Prisma.DocumentoCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentoPayload>
          }
          createMany: {
            args: Prisma.DocumentoCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.DocumentoCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentoPayload>[]
          }
          delete: {
            args: Prisma.DocumentoDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentoPayload>
          }
          update: {
            args: Prisma.DocumentoUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentoPayload>
          }
          deleteMany: {
            args: Prisma.DocumentoDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.DocumentoUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.DocumentoUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentoPayload>[]
          }
          upsert: {
            args: Prisma.DocumentoUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentoPayload>
          }
          aggregate: {
            args: Prisma.DocumentoAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateDocumento>
          }
          groupBy: {
            args: Prisma.DocumentoGroupByArgs<ExtArgs>
            result: $Utils.Optional<DocumentoGroupByOutputType>[]
          }
          count: {
            args: Prisma.DocumentoCountArgs<ExtArgs>
            result: $Utils.Optional<DocumentoCountAggregateOutputType> | number
          }
        }
      }
      ItemVenda: {
        payload: Prisma.$ItemVendaPayload<ExtArgs>
        fields: Prisma.ItemVendaFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ItemVendaFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItemVendaPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ItemVendaFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItemVendaPayload>
          }
          findFirst: {
            args: Prisma.ItemVendaFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItemVendaPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ItemVendaFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItemVendaPayload>
          }
          findMany: {
            args: Prisma.ItemVendaFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItemVendaPayload>[]
          }
          create: {
            args: Prisma.ItemVendaCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItemVendaPayload>
          }
          createMany: {
            args: Prisma.ItemVendaCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ItemVendaCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItemVendaPayload>[]
          }
          delete: {
            args: Prisma.ItemVendaDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItemVendaPayload>
          }
          update: {
            args: Prisma.ItemVendaUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItemVendaPayload>
          }
          deleteMany: {
            args: Prisma.ItemVendaDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ItemVendaUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ItemVendaUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItemVendaPayload>[]
          }
          upsert: {
            args: Prisma.ItemVendaUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItemVendaPayload>
          }
          aggregate: {
            args: Prisma.ItemVendaAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateItemVenda>
          }
          groupBy: {
            args: Prisma.ItemVendaGroupByArgs<ExtArgs>
            result: $Utils.Optional<ItemVendaGroupByOutputType>[]
          }
          count: {
            args: Prisma.ItemVendaCountArgs<ExtArgs>
            result: $Utils.Optional<ItemVendaCountAggregateOutputType> | number
          }
        }
      }
      ParcelaVencimento: {
        payload: Prisma.$ParcelaVencimentoPayload<ExtArgs>
        fields: Prisma.ParcelaVencimentoFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ParcelaVencimentoFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ParcelaVencimentoPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ParcelaVencimentoFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ParcelaVencimentoPayload>
          }
          findFirst: {
            args: Prisma.ParcelaVencimentoFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ParcelaVencimentoPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ParcelaVencimentoFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ParcelaVencimentoPayload>
          }
          findMany: {
            args: Prisma.ParcelaVencimentoFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ParcelaVencimentoPayload>[]
          }
          create: {
            args: Prisma.ParcelaVencimentoCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ParcelaVencimentoPayload>
          }
          createMany: {
            args: Prisma.ParcelaVencimentoCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ParcelaVencimentoCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ParcelaVencimentoPayload>[]
          }
          delete: {
            args: Prisma.ParcelaVencimentoDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ParcelaVencimentoPayload>
          }
          update: {
            args: Prisma.ParcelaVencimentoUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ParcelaVencimentoPayload>
          }
          deleteMany: {
            args: Prisma.ParcelaVencimentoDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ParcelaVencimentoUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ParcelaVencimentoUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ParcelaVencimentoPayload>[]
          }
          upsert: {
            args: Prisma.ParcelaVencimentoUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ParcelaVencimentoPayload>
          }
          aggregate: {
            args: Prisma.ParcelaVencimentoAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateParcelaVencimento>
          }
          groupBy: {
            args: Prisma.ParcelaVencimentoGroupByArgs<ExtArgs>
            result: $Utils.Optional<ParcelaVencimentoGroupByOutputType>[]
          }
          count: {
            args: Prisma.ParcelaVencimentoCountArgs<ExtArgs>
            result: $Utils.Optional<ParcelaVencimentoCountAggregateOutputType> | number
          }
        }
      }
      Config: {
        payload: Prisma.$ConfigPayload<ExtArgs>
        fields: Prisma.ConfigFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ConfigFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfigPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ConfigFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfigPayload>
          }
          findFirst: {
            args: Prisma.ConfigFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfigPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ConfigFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfigPayload>
          }
          findMany: {
            args: Prisma.ConfigFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfigPayload>[]
          }
          create: {
            args: Prisma.ConfigCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfigPayload>
          }
          createMany: {
            args: Prisma.ConfigCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ConfigCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfigPayload>[]
          }
          delete: {
            args: Prisma.ConfigDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfigPayload>
          }
          update: {
            args: Prisma.ConfigUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfigPayload>
          }
          deleteMany: {
            args: Prisma.ConfigDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ConfigUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ConfigUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfigPayload>[]
          }
          upsert: {
            args: Prisma.ConfigUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConfigPayload>
          }
          aggregate: {
            args: Prisma.ConfigAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateConfig>
          }
          groupBy: {
            args: Prisma.ConfigGroupByArgs<ExtArgs>
            result: $Utils.Optional<ConfigGroupByOutputType>[]
          }
          count: {
            args: Prisma.ConfigCountArgs<ExtArgs>
            result: $Utils.Optional<ConfigCountAggregateOutputType> | number
          }
        }
      }
      Usuario: {
        payload: Prisma.$UsuarioPayload<ExtArgs>
        fields: Prisma.UsuarioFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UsuarioFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsuarioPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UsuarioFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsuarioPayload>
          }
          findFirst: {
            args: Prisma.UsuarioFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsuarioPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UsuarioFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsuarioPayload>
          }
          findMany: {
            args: Prisma.UsuarioFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsuarioPayload>[]
          }
          create: {
            args: Prisma.UsuarioCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsuarioPayload>
          }
          createMany: {
            args: Prisma.UsuarioCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UsuarioCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsuarioPayload>[]
          }
          delete: {
            args: Prisma.UsuarioDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsuarioPayload>
          }
          update: {
            args: Prisma.UsuarioUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsuarioPayload>
          }
          deleteMany: {
            args: Prisma.UsuarioDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UsuarioUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UsuarioUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsuarioPayload>[]
          }
          upsert: {
            args: Prisma.UsuarioUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UsuarioPayload>
          }
          aggregate: {
            args: Prisma.UsuarioAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUsuario>
          }
          groupBy: {
            args: Prisma.UsuarioGroupByArgs<ExtArgs>
            result: $Utils.Optional<UsuarioGroupByOutputType>[]
          }
          count: {
            args: Prisma.UsuarioCountArgs<ExtArgs>
            result: $Utils.Optional<UsuarioCountAggregateOutputType> | number
          }
        }
      }
      Fornecedor: {
        payload: Prisma.$FornecedorPayload<ExtArgs>
        fields: Prisma.FornecedorFieldRefs
        operations: {
          findUnique: {
            args: Prisma.FornecedorFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FornecedorPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.FornecedorFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FornecedorPayload>
          }
          findFirst: {
            args: Prisma.FornecedorFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FornecedorPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.FornecedorFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FornecedorPayload>
          }
          findMany: {
            args: Prisma.FornecedorFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FornecedorPayload>[]
          }
          create: {
            args: Prisma.FornecedorCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FornecedorPayload>
          }
          createMany: {
            args: Prisma.FornecedorCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.FornecedorCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FornecedorPayload>[]
          }
          delete: {
            args: Prisma.FornecedorDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FornecedorPayload>
          }
          update: {
            args: Prisma.FornecedorUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FornecedorPayload>
          }
          deleteMany: {
            args: Prisma.FornecedorDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.FornecedorUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.FornecedorUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FornecedorPayload>[]
          }
          upsert: {
            args: Prisma.FornecedorUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FornecedorPayload>
          }
          aggregate: {
            args: Prisma.FornecedorAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateFornecedor>
          }
          groupBy: {
            args: Prisma.FornecedorGroupByArgs<ExtArgs>
            result: $Utils.Optional<FornecedorGroupByOutputType>[]
          }
          count: {
            args: Prisma.FornecedorCountArgs<ExtArgs>
            result: $Utils.Optional<FornecedorCountAggregateOutputType> | number
          }
        }
      }
      EmpresaParceira: {
        payload: Prisma.$EmpresaParceiraPayload<ExtArgs>
        fields: Prisma.EmpresaParceiraFieldRefs
        operations: {
          findUnique: {
            args: Prisma.EmpresaParceiraFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmpresaParceiraPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.EmpresaParceiraFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmpresaParceiraPayload>
          }
          findFirst: {
            args: Prisma.EmpresaParceiraFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmpresaParceiraPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.EmpresaParceiraFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmpresaParceiraPayload>
          }
          findMany: {
            args: Prisma.EmpresaParceiraFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmpresaParceiraPayload>[]
          }
          create: {
            args: Prisma.EmpresaParceiraCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmpresaParceiraPayload>
          }
          createMany: {
            args: Prisma.EmpresaParceiraCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.EmpresaParceiraCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmpresaParceiraPayload>[]
          }
          delete: {
            args: Prisma.EmpresaParceiraDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmpresaParceiraPayload>
          }
          update: {
            args: Prisma.EmpresaParceiraUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmpresaParceiraPayload>
          }
          deleteMany: {
            args: Prisma.EmpresaParceiraDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.EmpresaParceiraUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.EmpresaParceiraUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmpresaParceiraPayload>[]
          }
          upsert: {
            args: Prisma.EmpresaParceiraUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EmpresaParceiraPayload>
          }
          aggregate: {
            args: Prisma.EmpresaParceiraAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateEmpresaParceira>
          }
          groupBy: {
            args: Prisma.EmpresaParceiraGroupByArgs<ExtArgs>
            result: $Utils.Optional<EmpresaParceiraGroupByOutputType>[]
          }
          count: {
            args: Prisma.EmpresaParceiraCountArgs<ExtArgs>
            result: $Utils.Optional<EmpresaParceiraCountAggregateOutputType> | number
          }
        }
      }
      Pagamento: {
        payload: Prisma.$PagamentoPayload<ExtArgs>
        fields: Prisma.PagamentoFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PagamentoFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PagamentoPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PagamentoFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PagamentoPayload>
          }
          findFirst: {
            args: Prisma.PagamentoFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PagamentoPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PagamentoFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PagamentoPayload>
          }
          findMany: {
            args: Prisma.PagamentoFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PagamentoPayload>[]
          }
          create: {
            args: Prisma.PagamentoCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PagamentoPayload>
          }
          createMany: {
            args: Prisma.PagamentoCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.PagamentoCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PagamentoPayload>[]
          }
          delete: {
            args: Prisma.PagamentoDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PagamentoPayload>
          }
          update: {
            args: Prisma.PagamentoUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PagamentoPayload>
          }
          deleteMany: {
            args: Prisma.PagamentoDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.PagamentoUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.PagamentoUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PagamentoPayload>[]
          }
          upsert: {
            args: Prisma.PagamentoUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PagamentoPayload>
          }
          aggregate: {
            args: Prisma.PagamentoAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePagamento>
          }
          groupBy: {
            args: Prisma.PagamentoGroupByArgs<ExtArgs>
            result: $Utils.Optional<PagamentoGroupByOutputType>[]
          }
          count: {
            args: Prisma.PagamentoCountArgs<ExtArgs>
            result: $Utils.Optional<PagamentoCountAggregateOutputType> | number
          }
        }
      }
      AuditLog: {
        payload: Prisma.$AuditLogPayload<ExtArgs>
        fields: Prisma.AuditLogFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AuditLogFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AuditLogFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          findFirst: {
            args: Prisma.AuditLogFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AuditLogFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          findMany: {
            args: Prisma.AuditLogFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>[]
          }
          create: {
            args: Prisma.AuditLogCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          createMany: {
            args: Prisma.AuditLogCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AuditLogCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>[]
          }
          delete: {
            args: Prisma.AuditLogDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          update: {
            args: Prisma.AuditLogUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          deleteMany: {
            args: Prisma.AuditLogDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AuditLogUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AuditLogUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>[]
          }
          upsert: {
            args: Prisma.AuditLogUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          aggregate: {
            args: Prisma.AuditLogAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAuditLog>
          }
          groupBy: {
            args: Prisma.AuditLogGroupByArgs<ExtArgs>
            result: $Utils.Optional<AuditLogGroupByOutputType>[]
          }
          count: {
            args: Prisma.AuditLogCountArgs<ExtArgs>
            result: $Utils.Optional<AuditLogCountAggregateOutputType> | number
          }
        }
      }
      Despesa: {
        payload: Prisma.$DespesaPayload<ExtArgs>
        fields: Prisma.DespesaFieldRefs
        operations: {
          findUnique: {
            args: Prisma.DespesaFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DespesaPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.DespesaFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DespesaPayload>
          }
          findFirst: {
            args: Prisma.DespesaFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DespesaPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.DespesaFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DespesaPayload>
          }
          findMany: {
            args: Prisma.DespesaFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DespesaPayload>[]
          }
          create: {
            args: Prisma.DespesaCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DespesaPayload>
          }
          createMany: {
            args: Prisma.DespesaCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.DespesaCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DespesaPayload>[]
          }
          delete: {
            args: Prisma.DespesaDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DespesaPayload>
          }
          update: {
            args: Prisma.DespesaUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DespesaPayload>
          }
          deleteMany: {
            args: Prisma.DespesaDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.DespesaUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.DespesaUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DespesaPayload>[]
          }
          upsert: {
            args: Prisma.DespesaUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DespesaPayload>
          }
          aggregate: {
            args: Prisma.DespesaAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateDespesa>
          }
          groupBy: {
            args: Prisma.DespesaGroupByArgs<ExtArgs>
            result: $Utils.Optional<DespesaGroupByOutputType>[]
          }
          count: {
            args: Prisma.DespesaCountArgs<ExtArgs>
            result: $Utils.Optional<DespesaCountAggregateOutputType> | number
          }
        }
      }
      Aviso: {
        payload: Prisma.$AvisoPayload<ExtArgs>
        fields: Prisma.AvisoFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AvisoFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AvisoPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AvisoFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AvisoPayload>
          }
          findFirst: {
            args: Prisma.AvisoFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AvisoPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AvisoFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AvisoPayload>
          }
          findMany: {
            args: Prisma.AvisoFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AvisoPayload>[]
          }
          create: {
            args: Prisma.AvisoCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AvisoPayload>
          }
          createMany: {
            args: Prisma.AvisoCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AvisoCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AvisoPayload>[]
          }
          delete: {
            args: Prisma.AvisoDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AvisoPayload>
          }
          update: {
            args: Prisma.AvisoUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AvisoPayload>
          }
          deleteMany: {
            args: Prisma.AvisoDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AvisoUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AvisoUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AvisoPayload>[]
          }
          upsert: {
            args: Prisma.AvisoUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AvisoPayload>
          }
          aggregate: {
            args: Prisma.AvisoAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAviso>
          }
          groupBy: {
            args: Prisma.AvisoGroupByArgs<ExtArgs>
            result: $Utils.Optional<AvisoGroupByOutputType>[]
          }
          count: {
            args: Prisma.AvisoCountArgs<ExtArgs>
            result: $Utils.Optional<AvisoCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory | null
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    cliente?: ClienteOmit
    produto?: ProdutoOmit
    venda?: VendaOmit
    documento?: DocumentoOmit
    itemVenda?: ItemVendaOmit
    parcelaVencimento?: ParcelaVencimentoOmit
    config?: ConfigOmit
    usuario?: UsuarioOmit
    fornecedor?: FornecedorOmit
    empresaParceira?: EmpresaParceiraOmit
    pagamento?: PagamentoOmit
    auditLog?: AuditLogOmit
    despesa?: DespesaOmit
    aviso?: AvisoOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type ClienteCountOutputType
   */

  export type ClienteCountOutputType = {
    vendas: number
  }

  export type ClienteCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    vendas?: boolean | ClienteCountOutputTypeCountVendasArgs
  }

  // Custom InputTypes
  /**
   * ClienteCountOutputType without action
   */
  export type ClienteCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ClienteCountOutputType
     */
    select?: ClienteCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * ClienteCountOutputType without action
   */
  export type ClienteCountOutputTypeCountVendasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: VendaWhereInput
  }


  /**
   * Count Type VendaCountOutputType
   */

  export type VendaCountOutputType = {
    itens: number
    parcelasVencimento: number
    documentos: number
  }

  export type VendaCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    itens?: boolean | VendaCountOutputTypeCountItensArgs
    parcelasVencimento?: boolean | VendaCountOutputTypeCountParcelasVencimentoArgs
    documentos?: boolean | VendaCountOutputTypeCountDocumentosArgs
  }

  // Custom InputTypes
  /**
   * VendaCountOutputType without action
   */
  export type VendaCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the VendaCountOutputType
     */
    select?: VendaCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * VendaCountOutputType without action
   */
  export type VendaCountOutputTypeCountItensArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ItemVendaWhereInput
  }

  /**
   * VendaCountOutputType without action
   */
  export type VendaCountOutputTypeCountParcelasVencimentoArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ParcelaVencimentoWhereInput
  }

  /**
   * VendaCountOutputType without action
   */
  export type VendaCountOutputTypeCountDocumentosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: DocumentoWhereInput
  }


  /**
   * Count Type FornecedorCountOutputType
   */

  export type FornecedorCountOutputType = {
    produtos: number
  }

  export type FornecedorCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    produtos?: boolean | FornecedorCountOutputTypeCountProdutosArgs
  }

  // Custom InputTypes
  /**
   * FornecedorCountOutputType without action
   */
  export type FornecedorCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FornecedorCountOutputType
     */
    select?: FornecedorCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * FornecedorCountOutputType without action
   */
  export type FornecedorCountOutputTypeCountProdutosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProdutoWhereInput
  }


  /**
   * Models
   */

  /**
   * Model Cliente
   */

  export type AggregateCliente = {
    _count: ClienteCountAggregateOutputType | null
    _avg: ClienteAvgAggregateOutputType | null
    _sum: ClienteSumAggregateOutputType | null
    _min: ClienteMinAggregateOutputType | null
    _max: ClienteMaxAggregateOutputType | null
  }

  export type ClienteAvgAggregateOutputType = {
    id: number | null
    renda: number | null
  }

  export type ClienteSumAggregateOutputType = {
    id: number | null
    renda: number | null
  }

  export type ClienteMinAggregateOutputType = {
    id: number | null
    nome: string | null
    renda: number | null
    empresa: string | null
    matricula: string | null
    telefone: string | null
    cpf: string | null
    cnpj: string | null
    tipo: string | null
    dataNascimento: Date | null
    cep: string | null
    endereco: string | null
    email: string | null
    asaasCustomerId: string | null
  }

  export type ClienteMaxAggregateOutputType = {
    id: number | null
    nome: string | null
    renda: number | null
    empresa: string | null
    matricula: string | null
    telefone: string | null
    cpf: string | null
    cnpj: string | null
    tipo: string | null
    dataNascimento: Date | null
    cep: string | null
    endereco: string | null
    email: string | null
    asaasCustomerId: string | null
  }

  export type ClienteCountAggregateOutputType = {
    id: number
    nome: number
    renda: number
    empresa: number
    matricula: number
    telefone: number
    cpf: number
    cnpj: number
    tipo: number
    dataNascimento: number
    cep: number
    endereco: number
    email: number
    asaasCustomerId: number
    _all: number
  }


  export type ClienteAvgAggregateInputType = {
    id?: true
    renda?: true
  }

  export type ClienteSumAggregateInputType = {
    id?: true
    renda?: true
  }

  export type ClienteMinAggregateInputType = {
    id?: true
    nome?: true
    renda?: true
    empresa?: true
    matricula?: true
    telefone?: true
    cpf?: true
    cnpj?: true
    tipo?: true
    dataNascimento?: true
    cep?: true
    endereco?: true
    email?: true
    asaasCustomerId?: true
  }

  export type ClienteMaxAggregateInputType = {
    id?: true
    nome?: true
    renda?: true
    empresa?: true
    matricula?: true
    telefone?: true
    cpf?: true
    cnpj?: true
    tipo?: true
    dataNascimento?: true
    cep?: true
    endereco?: true
    email?: true
    asaasCustomerId?: true
  }

  export type ClienteCountAggregateInputType = {
    id?: true
    nome?: true
    renda?: true
    empresa?: true
    matricula?: true
    telefone?: true
    cpf?: true
    cnpj?: true
    tipo?: true
    dataNascimento?: true
    cep?: true
    endereco?: true
    email?: true
    asaasCustomerId?: true
    _all?: true
  }

  export type ClienteAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Cliente to aggregate.
     */
    where?: ClienteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Clientes to fetch.
     */
    orderBy?: ClienteOrderByWithRelationInput | ClienteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ClienteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Clientes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Clientes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Clientes
    **/
    _count?: true | ClienteCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ClienteAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ClienteSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ClienteMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ClienteMaxAggregateInputType
  }

  export type GetClienteAggregateType<T extends ClienteAggregateArgs> = {
        [P in keyof T & keyof AggregateCliente]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCliente[P]>
      : GetScalarType<T[P], AggregateCliente[P]>
  }




  export type ClienteGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ClienteWhereInput
    orderBy?: ClienteOrderByWithAggregationInput | ClienteOrderByWithAggregationInput[]
    by: ClienteScalarFieldEnum[] | ClienteScalarFieldEnum
    having?: ClienteScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ClienteCountAggregateInputType | true
    _avg?: ClienteAvgAggregateInputType
    _sum?: ClienteSumAggregateInputType
    _min?: ClienteMinAggregateInputType
    _max?: ClienteMaxAggregateInputType
  }

  export type ClienteGroupByOutputType = {
    id: number
    nome: string
    renda: number | null
    empresa: string | null
    matricula: string | null
    telefone: string | null
    cpf: string | null
    cnpj: string | null
    tipo: string | null
    dataNascimento: Date | null
    cep: string | null
    endereco: string | null
    email: string | null
    asaasCustomerId: string | null
    _count: ClienteCountAggregateOutputType | null
    _avg: ClienteAvgAggregateOutputType | null
    _sum: ClienteSumAggregateOutputType | null
    _min: ClienteMinAggregateOutputType | null
    _max: ClienteMaxAggregateOutputType | null
  }

  type GetClienteGroupByPayload<T extends ClienteGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ClienteGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ClienteGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ClienteGroupByOutputType[P]>
            : GetScalarType<T[P], ClienteGroupByOutputType[P]>
        }
      >
    >


  export type ClienteSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    nome?: boolean
    renda?: boolean
    empresa?: boolean
    matricula?: boolean
    telefone?: boolean
    cpf?: boolean
    cnpj?: boolean
    tipo?: boolean
    dataNascimento?: boolean
    cep?: boolean
    endereco?: boolean
    email?: boolean
    asaasCustomerId?: boolean
    vendas?: boolean | Cliente$vendasArgs<ExtArgs>
    _count?: boolean | ClienteCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["cliente"]>

  export type ClienteSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    nome?: boolean
    renda?: boolean
    empresa?: boolean
    matricula?: boolean
    telefone?: boolean
    cpf?: boolean
    cnpj?: boolean
    tipo?: boolean
    dataNascimento?: boolean
    cep?: boolean
    endereco?: boolean
    email?: boolean
    asaasCustomerId?: boolean
  }, ExtArgs["result"]["cliente"]>

  export type ClienteSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    nome?: boolean
    renda?: boolean
    empresa?: boolean
    matricula?: boolean
    telefone?: boolean
    cpf?: boolean
    cnpj?: boolean
    tipo?: boolean
    dataNascimento?: boolean
    cep?: boolean
    endereco?: boolean
    email?: boolean
    asaasCustomerId?: boolean
  }, ExtArgs["result"]["cliente"]>

  export type ClienteSelectScalar = {
    id?: boolean
    nome?: boolean
    renda?: boolean
    empresa?: boolean
    matricula?: boolean
    telefone?: boolean
    cpf?: boolean
    cnpj?: boolean
    tipo?: boolean
    dataNascimento?: boolean
    cep?: boolean
    endereco?: boolean
    email?: boolean
    asaasCustomerId?: boolean
  }

  export type ClienteOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "nome" | "renda" | "empresa" | "matricula" | "telefone" | "cpf" | "cnpj" | "tipo" | "dataNascimento" | "cep" | "endereco" | "email" | "asaasCustomerId", ExtArgs["result"]["cliente"]>
  export type ClienteInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    vendas?: boolean | Cliente$vendasArgs<ExtArgs>
    _count?: boolean | ClienteCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type ClienteIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type ClienteIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $ClientePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Cliente"
    objects: {
      vendas: Prisma.$VendaPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      nome: string
      renda: number | null
      empresa: string | null
      matricula: string | null
      telefone: string | null
      cpf: string | null
      cnpj: string | null
      tipo: string | null
      dataNascimento: Date | null
      cep: string | null
      endereco: string | null
      email: string | null
      asaasCustomerId: string | null
    }, ExtArgs["result"]["cliente"]>
    composites: {}
  }

  type ClienteGetPayload<S extends boolean | null | undefined | ClienteDefaultArgs> = $Result.GetResult<Prisma.$ClientePayload, S>

  type ClienteCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ClienteFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ClienteCountAggregateInputType | true
    }

  export interface ClienteDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Cliente'], meta: { name: 'Cliente' } }
    /**
     * Find zero or one Cliente that matches the filter.
     * @param {ClienteFindUniqueArgs} args - Arguments to find a Cliente
     * @example
     * // Get one Cliente
     * const cliente = await prisma.cliente.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ClienteFindUniqueArgs>(args: SelectSubset<T, ClienteFindUniqueArgs<ExtArgs>>): Prisma__ClienteClient<$Result.GetResult<Prisma.$ClientePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Cliente that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ClienteFindUniqueOrThrowArgs} args - Arguments to find a Cliente
     * @example
     * // Get one Cliente
     * const cliente = await prisma.cliente.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ClienteFindUniqueOrThrowArgs>(args: SelectSubset<T, ClienteFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ClienteClient<$Result.GetResult<Prisma.$ClientePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Cliente that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ClienteFindFirstArgs} args - Arguments to find a Cliente
     * @example
     * // Get one Cliente
     * const cliente = await prisma.cliente.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ClienteFindFirstArgs>(args?: SelectSubset<T, ClienteFindFirstArgs<ExtArgs>>): Prisma__ClienteClient<$Result.GetResult<Prisma.$ClientePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Cliente that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ClienteFindFirstOrThrowArgs} args - Arguments to find a Cliente
     * @example
     * // Get one Cliente
     * const cliente = await prisma.cliente.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ClienteFindFirstOrThrowArgs>(args?: SelectSubset<T, ClienteFindFirstOrThrowArgs<ExtArgs>>): Prisma__ClienteClient<$Result.GetResult<Prisma.$ClientePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Clientes that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ClienteFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Clientes
     * const clientes = await prisma.cliente.findMany()
     * 
     * // Get first 10 Clientes
     * const clientes = await prisma.cliente.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const clienteWithIdOnly = await prisma.cliente.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ClienteFindManyArgs>(args?: SelectSubset<T, ClienteFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ClientePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Cliente.
     * @param {ClienteCreateArgs} args - Arguments to create a Cliente.
     * @example
     * // Create one Cliente
     * const Cliente = await prisma.cliente.create({
     *   data: {
     *     // ... data to create a Cliente
     *   }
     * })
     * 
     */
    create<T extends ClienteCreateArgs>(args: SelectSubset<T, ClienteCreateArgs<ExtArgs>>): Prisma__ClienteClient<$Result.GetResult<Prisma.$ClientePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Clientes.
     * @param {ClienteCreateManyArgs} args - Arguments to create many Clientes.
     * @example
     * // Create many Clientes
     * const cliente = await prisma.cliente.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ClienteCreateManyArgs>(args?: SelectSubset<T, ClienteCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Clientes and returns the data saved in the database.
     * @param {ClienteCreateManyAndReturnArgs} args - Arguments to create many Clientes.
     * @example
     * // Create many Clientes
     * const cliente = await prisma.cliente.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Clientes and only return the `id`
     * const clienteWithIdOnly = await prisma.cliente.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ClienteCreateManyAndReturnArgs>(args?: SelectSubset<T, ClienteCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ClientePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Cliente.
     * @param {ClienteDeleteArgs} args - Arguments to delete one Cliente.
     * @example
     * // Delete one Cliente
     * const Cliente = await prisma.cliente.delete({
     *   where: {
     *     // ... filter to delete one Cliente
     *   }
     * })
     * 
     */
    delete<T extends ClienteDeleteArgs>(args: SelectSubset<T, ClienteDeleteArgs<ExtArgs>>): Prisma__ClienteClient<$Result.GetResult<Prisma.$ClientePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Cliente.
     * @param {ClienteUpdateArgs} args - Arguments to update one Cliente.
     * @example
     * // Update one Cliente
     * const cliente = await prisma.cliente.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ClienteUpdateArgs>(args: SelectSubset<T, ClienteUpdateArgs<ExtArgs>>): Prisma__ClienteClient<$Result.GetResult<Prisma.$ClientePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Clientes.
     * @param {ClienteDeleteManyArgs} args - Arguments to filter Clientes to delete.
     * @example
     * // Delete a few Clientes
     * const { count } = await prisma.cliente.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ClienteDeleteManyArgs>(args?: SelectSubset<T, ClienteDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Clientes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ClienteUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Clientes
     * const cliente = await prisma.cliente.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ClienteUpdateManyArgs>(args: SelectSubset<T, ClienteUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Clientes and returns the data updated in the database.
     * @param {ClienteUpdateManyAndReturnArgs} args - Arguments to update many Clientes.
     * @example
     * // Update many Clientes
     * const cliente = await prisma.cliente.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Clientes and only return the `id`
     * const clienteWithIdOnly = await prisma.cliente.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ClienteUpdateManyAndReturnArgs>(args: SelectSubset<T, ClienteUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ClientePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Cliente.
     * @param {ClienteUpsertArgs} args - Arguments to update or create a Cliente.
     * @example
     * // Update or create a Cliente
     * const cliente = await prisma.cliente.upsert({
     *   create: {
     *     // ... data to create a Cliente
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Cliente we want to update
     *   }
     * })
     */
    upsert<T extends ClienteUpsertArgs>(args: SelectSubset<T, ClienteUpsertArgs<ExtArgs>>): Prisma__ClienteClient<$Result.GetResult<Prisma.$ClientePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Clientes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ClienteCountArgs} args - Arguments to filter Clientes to count.
     * @example
     * // Count the number of Clientes
     * const count = await prisma.cliente.count({
     *   where: {
     *     // ... the filter for the Clientes we want to count
     *   }
     * })
    **/
    count<T extends ClienteCountArgs>(
      args?: Subset<T, ClienteCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ClienteCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Cliente.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ClienteAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ClienteAggregateArgs>(args: Subset<T, ClienteAggregateArgs>): Prisma.PrismaPromise<GetClienteAggregateType<T>>

    /**
     * Group by Cliente.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ClienteGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ClienteGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ClienteGroupByArgs['orderBy'] }
        : { orderBy?: ClienteGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ClienteGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetClienteGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Cliente model
   */
  readonly fields: ClienteFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Cliente.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ClienteClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    vendas<T extends Cliente$vendasArgs<ExtArgs> = {}>(args?: Subset<T, Cliente$vendasArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VendaPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Cliente model
   */
  interface ClienteFieldRefs {
    readonly id: FieldRef<"Cliente", 'Int'>
    readonly nome: FieldRef<"Cliente", 'String'>
    readonly renda: FieldRef<"Cliente", 'Float'>
    readonly empresa: FieldRef<"Cliente", 'String'>
    readonly matricula: FieldRef<"Cliente", 'String'>
    readonly telefone: FieldRef<"Cliente", 'String'>
    readonly cpf: FieldRef<"Cliente", 'String'>
    readonly cnpj: FieldRef<"Cliente", 'String'>
    readonly tipo: FieldRef<"Cliente", 'String'>
    readonly dataNascimento: FieldRef<"Cliente", 'DateTime'>
    readonly cep: FieldRef<"Cliente", 'String'>
    readonly endereco: FieldRef<"Cliente", 'String'>
    readonly email: FieldRef<"Cliente", 'String'>
    readonly asaasCustomerId: FieldRef<"Cliente", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Cliente findUnique
   */
  export type ClienteFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cliente
     */
    select?: ClienteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cliente
     */
    omit?: ClienteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClienteInclude<ExtArgs> | null
    /**
     * Filter, which Cliente to fetch.
     */
    where: ClienteWhereUniqueInput
  }

  /**
   * Cliente findUniqueOrThrow
   */
  export type ClienteFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cliente
     */
    select?: ClienteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cliente
     */
    omit?: ClienteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClienteInclude<ExtArgs> | null
    /**
     * Filter, which Cliente to fetch.
     */
    where: ClienteWhereUniqueInput
  }

  /**
   * Cliente findFirst
   */
  export type ClienteFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cliente
     */
    select?: ClienteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cliente
     */
    omit?: ClienteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClienteInclude<ExtArgs> | null
    /**
     * Filter, which Cliente to fetch.
     */
    where?: ClienteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Clientes to fetch.
     */
    orderBy?: ClienteOrderByWithRelationInput | ClienteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Clientes.
     */
    cursor?: ClienteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Clientes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Clientes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Clientes.
     */
    distinct?: ClienteScalarFieldEnum | ClienteScalarFieldEnum[]
  }

  /**
   * Cliente findFirstOrThrow
   */
  export type ClienteFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cliente
     */
    select?: ClienteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cliente
     */
    omit?: ClienteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClienteInclude<ExtArgs> | null
    /**
     * Filter, which Cliente to fetch.
     */
    where?: ClienteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Clientes to fetch.
     */
    orderBy?: ClienteOrderByWithRelationInput | ClienteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Clientes.
     */
    cursor?: ClienteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Clientes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Clientes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Clientes.
     */
    distinct?: ClienteScalarFieldEnum | ClienteScalarFieldEnum[]
  }

  /**
   * Cliente findMany
   */
  export type ClienteFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cliente
     */
    select?: ClienteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cliente
     */
    omit?: ClienteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClienteInclude<ExtArgs> | null
    /**
     * Filter, which Clientes to fetch.
     */
    where?: ClienteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Clientes to fetch.
     */
    orderBy?: ClienteOrderByWithRelationInput | ClienteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Clientes.
     */
    cursor?: ClienteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Clientes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Clientes.
     */
    skip?: number
    distinct?: ClienteScalarFieldEnum | ClienteScalarFieldEnum[]
  }

  /**
   * Cliente create
   */
  export type ClienteCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cliente
     */
    select?: ClienteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cliente
     */
    omit?: ClienteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClienteInclude<ExtArgs> | null
    /**
     * The data needed to create a Cliente.
     */
    data: XOR<ClienteCreateInput, ClienteUncheckedCreateInput>
  }

  /**
   * Cliente createMany
   */
  export type ClienteCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Clientes.
     */
    data: ClienteCreateManyInput | ClienteCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Cliente createManyAndReturn
   */
  export type ClienteCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cliente
     */
    select?: ClienteSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Cliente
     */
    omit?: ClienteOmit<ExtArgs> | null
    /**
     * The data used to create many Clientes.
     */
    data: ClienteCreateManyInput | ClienteCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Cliente update
   */
  export type ClienteUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cliente
     */
    select?: ClienteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cliente
     */
    omit?: ClienteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClienteInclude<ExtArgs> | null
    /**
     * The data needed to update a Cliente.
     */
    data: XOR<ClienteUpdateInput, ClienteUncheckedUpdateInput>
    /**
     * Choose, which Cliente to update.
     */
    where: ClienteWhereUniqueInput
  }

  /**
   * Cliente updateMany
   */
  export type ClienteUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Clientes.
     */
    data: XOR<ClienteUpdateManyMutationInput, ClienteUncheckedUpdateManyInput>
    /**
     * Filter which Clientes to update
     */
    where?: ClienteWhereInput
    /**
     * Limit how many Clientes to update.
     */
    limit?: number
  }

  /**
   * Cliente updateManyAndReturn
   */
  export type ClienteUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cliente
     */
    select?: ClienteSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Cliente
     */
    omit?: ClienteOmit<ExtArgs> | null
    /**
     * The data used to update Clientes.
     */
    data: XOR<ClienteUpdateManyMutationInput, ClienteUncheckedUpdateManyInput>
    /**
     * Filter which Clientes to update
     */
    where?: ClienteWhereInput
    /**
     * Limit how many Clientes to update.
     */
    limit?: number
  }

  /**
   * Cliente upsert
   */
  export type ClienteUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cliente
     */
    select?: ClienteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cliente
     */
    omit?: ClienteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClienteInclude<ExtArgs> | null
    /**
     * The filter to search for the Cliente to update in case it exists.
     */
    where: ClienteWhereUniqueInput
    /**
     * In case the Cliente found by the `where` argument doesn't exist, create a new Cliente with this data.
     */
    create: XOR<ClienteCreateInput, ClienteUncheckedCreateInput>
    /**
     * In case the Cliente was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ClienteUpdateInput, ClienteUncheckedUpdateInput>
  }

  /**
   * Cliente delete
   */
  export type ClienteDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cliente
     */
    select?: ClienteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cliente
     */
    omit?: ClienteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClienteInclude<ExtArgs> | null
    /**
     * Filter which Cliente to delete.
     */
    where: ClienteWhereUniqueInput
  }

  /**
   * Cliente deleteMany
   */
  export type ClienteDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Clientes to delete
     */
    where?: ClienteWhereInput
    /**
     * Limit how many Clientes to delete.
     */
    limit?: number
  }

  /**
   * Cliente.vendas
   */
  export type Cliente$vendasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Venda
     */
    select?: VendaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Venda
     */
    omit?: VendaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VendaInclude<ExtArgs> | null
    where?: VendaWhereInput
    orderBy?: VendaOrderByWithRelationInput | VendaOrderByWithRelationInput[]
    cursor?: VendaWhereUniqueInput
    take?: number
    skip?: number
    distinct?: VendaScalarFieldEnum | VendaScalarFieldEnum[]
  }

  /**
   * Cliente without action
   */
  export type ClienteDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cliente
     */
    select?: ClienteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cliente
     */
    omit?: ClienteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClienteInclude<ExtArgs> | null
  }


  /**
   * Model Produto
   */

  export type AggregateProduto = {
    _count: ProdutoCountAggregateOutputType | null
    _avg: ProdutoAvgAggregateOutputType | null
    _sum: ProdutoSumAggregateOutputType | null
    _min: ProdutoMinAggregateOutputType | null
    _max: ProdutoMaxAggregateOutputType | null
  }

  export type ProdutoAvgAggregateOutputType = {
    id: number | null
    custoPadrao: number | null
    fornecedorId: number | null
    qtdEstoque: number | null
    valorVenda: number | null
  }

  export type ProdutoSumAggregateOutputType = {
    id: number | null
    custoPadrao: number | null
    fornecedorId: number | null
    qtdEstoque: number | null
    valorVenda: number | null
  }

  export type ProdutoMinAggregateOutputType = {
    id: number | null
    nome: string | null
    custoPadrao: number | null
    marca: string | null
    categoria: string | null
    ncm: string | null
    imagem: string | null
    fornecedorId: number | null
    qtdEstoque: number | null
    valorVenda: number | null
  }

  export type ProdutoMaxAggregateOutputType = {
    id: number | null
    nome: string | null
    custoPadrao: number | null
    marca: string | null
    categoria: string | null
    ncm: string | null
    imagem: string | null
    fornecedorId: number | null
    qtdEstoque: number | null
    valorVenda: number | null
  }

  export type ProdutoCountAggregateOutputType = {
    id: number
    nome: number
    custoPadrao: number
    marca: number
    categoria: number
    ncm: number
    imagem: number
    fornecedorId: number
    qtdEstoque: number
    valorVenda: number
    _all: number
  }


  export type ProdutoAvgAggregateInputType = {
    id?: true
    custoPadrao?: true
    fornecedorId?: true
    qtdEstoque?: true
    valorVenda?: true
  }

  export type ProdutoSumAggregateInputType = {
    id?: true
    custoPadrao?: true
    fornecedorId?: true
    qtdEstoque?: true
    valorVenda?: true
  }

  export type ProdutoMinAggregateInputType = {
    id?: true
    nome?: true
    custoPadrao?: true
    marca?: true
    categoria?: true
    ncm?: true
    imagem?: true
    fornecedorId?: true
    qtdEstoque?: true
    valorVenda?: true
  }

  export type ProdutoMaxAggregateInputType = {
    id?: true
    nome?: true
    custoPadrao?: true
    marca?: true
    categoria?: true
    ncm?: true
    imagem?: true
    fornecedorId?: true
    qtdEstoque?: true
    valorVenda?: true
  }

  export type ProdutoCountAggregateInputType = {
    id?: true
    nome?: true
    custoPadrao?: true
    marca?: true
    categoria?: true
    ncm?: true
    imagem?: true
    fornecedorId?: true
    qtdEstoque?: true
    valorVenda?: true
    _all?: true
  }

  export type ProdutoAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Produto to aggregate.
     */
    where?: ProdutoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Produtos to fetch.
     */
    orderBy?: ProdutoOrderByWithRelationInput | ProdutoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ProdutoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Produtos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Produtos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Produtos
    **/
    _count?: true | ProdutoCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ProdutoAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ProdutoSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ProdutoMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ProdutoMaxAggregateInputType
  }

  export type GetProdutoAggregateType<T extends ProdutoAggregateArgs> = {
        [P in keyof T & keyof AggregateProduto]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateProduto[P]>
      : GetScalarType<T[P], AggregateProduto[P]>
  }




  export type ProdutoGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProdutoWhereInput
    orderBy?: ProdutoOrderByWithAggregationInput | ProdutoOrderByWithAggregationInput[]
    by: ProdutoScalarFieldEnum[] | ProdutoScalarFieldEnum
    having?: ProdutoScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ProdutoCountAggregateInputType | true
    _avg?: ProdutoAvgAggregateInputType
    _sum?: ProdutoSumAggregateInputType
    _min?: ProdutoMinAggregateInputType
    _max?: ProdutoMaxAggregateInputType
  }

  export type ProdutoGroupByOutputType = {
    id: number
    nome: string
    custoPadrao: number | null
    marca: string | null
    categoria: string | null
    ncm: string | null
    imagem: string | null
    fornecedorId: number | null
    qtdEstoque: number | null
    valorVenda: number | null
    _count: ProdutoCountAggregateOutputType | null
    _avg: ProdutoAvgAggregateOutputType | null
    _sum: ProdutoSumAggregateOutputType | null
    _min: ProdutoMinAggregateOutputType | null
    _max: ProdutoMaxAggregateOutputType | null
  }

  type GetProdutoGroupByPayload<T extends ProdutoGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ProdutoGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ProdutoGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ProdutoGroupByOutputType[P]>
            : GetScalarType<T[P], ProdutoGroupByOutputType[P]>
        }
      >
    >


  export type ProdutoSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    nome?: boolean
    custoPadrao?: boolean
    marca?: boolean
    categoria?: boolean
    ncm?: boolean
    imagem?: boolean
    fornecedorId?: boolean
    qtdEstoque?: boolean
    valorVenda?: boolean
    fornecedor?: boolean | Produto$fornecedorArgs<ExtArgs>
  }, ExtArgs["result"]["produto"]>

  export type ProdutoSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    nome?: boolean
    custoPadrao?: boolean
    marca?: boolean
    categoria?: boolean
    ncm?: boolean
    imagem?: boolean
    fornecedorId?: boolean
    qtdEstoque?: boolean
    valorVenda?: boolean
    fornecedor?: boolean | Produto$fornecedorArgs<ExtArgs>
  }, ExtArgs["result"]["produto"]>

  export type ProdutoSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    nome?: boolean
    custoPadrao?: boolean
    marca?: boolean
    categoria?: boolean
    ncm?: boolean
    imagem?: boolean
    fornecedorId?: boolean
    qtdEstoque?: boolean
    valorVenda?: boolean
    fornecedor?: boolean | Produto$fornecedorArgs<ExtArgs>
  }, ExtArgs["result"]["produto"]>

  export type ProdutoSelectScalar = {
    id?: boolean
    nome?: boolean
    custoPadrao?: boolean
    marca?: boolean
    categoria?: boolean
    ncm?: boolean
    imagem?: boolean
    fornecedorId?: boolean
    qtdEstoque?: boolean
    valorVenda?: boolean
  }

  export type ProdutoOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "nome" | "custoPadrao" | "marca" | "categoria" | "ncm" | "imagem" | "fornecedorId" | "qtdEstoque" | "valorVenda", ExtArgs["result"]["produto"]>
  export type ProdutoInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    fornecedor?: boolean | Produto$fornecedorArgs<ExtArgs>
  }
  export type ProdutoIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    fornecedor?: boolean | Produto$fornecedorArgs<ExtArgs>
  }
  export type ProdutoIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    fornecedor?: boolean | Produto$fornecedorArgs<ExtArgs>
  }

  export type $ProdutoPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Produto"
    objects: {
      fornecedor: Prisma.$FornecedorPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      nome: string
      custoPadrao: number | null
      marca: string | null
      categoria: string | null
      ncm: string | null
      imagem: string | null
      fornecedorId: number | null
      qtdEstoque: number | null
      valorVenda: number | null
    }, ExtArgs["result"]["produto"]>
    composites: {}
  }

  type ProdutoGetPayload<S extends boolean | null | undefined | ProdutoDefaultArgs> = $Result.GetResult<Prisma.$ProdutoPayload, S>

  type ProdutoCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ProdutoFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ProdutoCountAggregateInputType | true
    }

  export interface ProdutoDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Produto'], meta: { name: 'Produto' } }
    /**
     * Find zero or one Produto that matches the filter.
     * @param {ProdutoFindUniqueArgs} args - Arguments to find a Produto
     * @example
     * // Get one Produto
     * const produto = await prisma.produto.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ProdutoFindUniqueArgs>(args: SelectSubset<T, ProdutoFindUniqueArgs<ExtArgs>>): Prisma__ProdutoClient<$Result.GetResult<Prisma.$ProdutoPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Produto that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ProdutoFindUniqueOrThrowArgs} args - Arguments to find a Produto
     * @example
     * // Get one Produto
     * const produto = await prisma.produto.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ProdutoFindUniqueOrThrowArgs>(args: SelectSubset<T, ProdutoFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ProdutoClient<$Result.GetResult<Prisma.$ProdutoPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Produto that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProdutoFindFirstArgs} args - Arguments to find a Produto
     * @example
     * // Get one Produto
     * const produto = await prisma.produto.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ProdutoFindFirstArgs>(args?: SelectSubset<T, ProdutoFindFirstArgs<ExtArgs>>): Prisma__ProdutoClient<$Result.GetResult<Prisma.$ProdutoPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Produto that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProdutoFindFirstOrThrowArgs} args - Arguments to find a Produto
     * @example
     * // Get one Produto
     * const produto = await prisma.produto.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ProdutoFindFirstOrThrowArgs>(args?: SelectSubset<T, ProdutoFindFirstOrThrowArgs<ExtArgs>>): Prisma__ProdutoClient<$Result.GetResult<Prisma.$ProdutoPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Produtos that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProdutoFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Produtos
     * const produtos = await prisma.produto.findMany()
     * 
     * // Get first 10 Produtos
     * const produtos = await prisma.produto.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const produtoWithIdOnly = await prisma.produto.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ProdutoFindManyArgs>(args?: SelectSubset<T, ProdutoFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProdutoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Produto.
     * @param {ProdutoCreateArgs} args - Arguments to create a Produto.
     * @example
     * // Create one Produto
     * const Produto = await prisma.produto.create({
     *   data: {
     *     // ... data to create a Produto
     *   }
     * })
     * 
     */
    create<T extends ProdutoCreateArgs>(args: SelectSubset<T, ProdutoCreateArgs<ExtArgs>>): Prisma__ProdutoClient<$Result.GetResult<Prisma.$ProdutoPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Produtos.
     * @param {ProdutoCreateManyArgs} args - Arguments to create many Produtos.
     * @example
     * // Create many Produtos
     * const produto = await prisma.produto.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ProdutoCreateManyArgs>(args?: SelectSubset<T, ProdutoCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Produtos and returns the data saved in the database.
     * @param {ProdutoCreateManyAndReturnArgs} args - Arguments to create many Produtos.
     * @example
     * // Create many Produtos
     * const produto = await prisma.produto.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Produtos and only return the `id`
     * const produtoWithIdOnly = await prisma.produto.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ProdutoCreateManyAndReturnArgs>(args?: SelectSubset<T, ProdutoCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProdutoPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Produto.
     * @param {ProdutoDeleteArgs} args - Arguments to delete one Produto.
     * @example
     * // Delete one Produto
     * const Produto = await prisma.produto.delete({
     *   where: {
     *     // ... filter to delete one Produto
     *   }
     * })
     * 
     */
    delete<T extends ProdutoDeleteArgs>(args: SelectSubset<T, ProdutoDeleteArgs<ExtArgs>>): Prisma__ProdutoClient<$Result.GetResult<Prisma.$ProdutoPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Produto.
     * @param {ProdutoUpdateArgs} args - Arguments to update one Produto.
     * @example
     * // Update one Produto
     * const produto = await prisma.produto.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ProdutoUpdateArgs>(args: SelectSubset<T, ProdutoUpdateArgs<ExtArgs>>): Prisma__ProdutoClient<$Result.GetResult<Prisma.$ProdutoPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Produtos.
     * @param {ProdutoDeleteManyArgs} args - Arguments to filter Produtos to delete.
     * @example
     * // Delete a few Produtos
     * const { count } = await prisma.produto.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ProdutoDeleteManyArgs>(args?: SelectSubset<T, ProdutoDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Produtos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProdutoUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Produtos
     * const produto = await prisma.produto.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ProdutoUpdateManyArgs>(args: SelectSubset<T, ProdutoUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Produtos and returns the data updated in the database.
     * @param {ProdutoUpdateManyAndReturnArgs} args - Arguments to update many Produtos.
     * @example
     * // Update many Produtos
     * const produto = await prisma.produto.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Produtos and only return the `id`
     * const produtoWithIdOnly = await prisma.produto.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ProdutoUpdateManyAndReturnArgs>(args: SelectSubset<T, ProdutoUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProdutoPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Produto.
     * @param {ProdutoUpsertArgs} args - Arguments to update or create a Produto.
     * @example
     * // Update or create a Produto
     * const produto = await prisma.produto.upsert({
     *   create: {
     *     // ... data to create a Produto
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Produto we want to update
     *   }
     * })
     */
    upsert<T extends ProdutoUpsertArgs>(args: SelectSubset<T, ProdutoUpsertArgs<ExtArgs>>): Prisma__ProdutoClient<$Result.GetResult<Prisma.$ProdutoPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Produtos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProdutoCountArgs} args - Arguments to filter Produtos to count.
     * @example
     * // Count the number of Produtos
     * const count = await prisma.produto.count({
     *   where: {
     *     // ... the filter for the Produtos we want to count
     *   }
     * })
    **/
    count<T extends ProdutoCountArgs>(
      args?: Subset<T, ProdutoCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ProdutoCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Produto.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProdutoAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ProdutoAggregateArgs>(args: Subset<T, ProdutoAggregateArgs>): Prisma.PrismaPromise<GetProdutoAggregateType<T>>

    /**
     * Group by Produto.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProdutoGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ProdutoGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ProdutoGroupByArgs['orderBy'] }
        : { orderBy?: ProdutoGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ProdutoGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetProdutoGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Produto model
   */
  readonly fields: ProdutoFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Produto.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ProdutoClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    fornecedor<T extends Produto$fornecedorArgs<ExtArgs> = {}>(args?: Subset<T, Produto$fornecedorArgs<ExtArgs>>): Prisma__FornecedorClient<$Result.GetResult<Prisma.$FornecedorPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Produto model
   */
  interface ProdutoFieldRefs {
    readonly id: FieldRef<"Produto", 'Int'>
    readonly nome: FieldRef<"Produto", 'String'>
    readonly custoPadrao: FieldRef<"Produto", 'Float'>
    readonly marca: FieldRef<"Produto", 'String'>
    readonly categoria: FieldRef<"Produto", 'String'>
    readonly ncm: FieldRef<"Produto", 'String'>
    readonly imagem: FieldRef<"Produto", 'String'>
    readonly fornecedorId: FieldRef<"Produto", 'Int'>
    readonly qtdEstoque: FieldRef<"Produto", 'Int'>
    readonly valorVenda: FieldRef<"Produto", 'Float'>
  }
    

  // Custom InputTypes
  /**
   * Produto findUnique
   */
  export type ProdutoFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Produto
     */
    select?: ProdutoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Produto
     */
    omit?: ProdutoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProdutoInclude<ExtArgs> | null
    /**
     * Filter, which Produto to fetch.
     */
    where: ProdutoWhereUniqueInput
  }

  /**
   * Produto findUniqueOrThrow
   */
  export type ProdutoFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Produto
     */
    select?: ProdutoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Produto
     */
    omit?: ProdutoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProdutoInclude<ExtArgs> | null
    /**
     * Filter, which Produto to fetch.
     */
    where: ProdutoWhereUniqueInput
  }

  /**
   * Produto findFirst
   */
  export type ProdutoFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Produto
     */
    select?: ProdutoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Produto
     */
    omit?: ProdutoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProdutoInclude<ExtArgs> | null
    /**
     * Filter, which Produto to fetch.
     */
    where?: ProdutoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Produtos to fetch.
     */
    orderBy?: ProdutoOrderByWithRelationInput | ProdutoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Produtos.
     */
    cursor?: ProdutoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Produtos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Produtos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Produtos.
     */
    distinct?: ProdutoScalarFieldEnum | ProdutoScalarFieldEnum[]
  }

  /**
   * Produto findFirstOrThrow
   */
  export type ProdutoFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Produto
     */
    select?: ProdutoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Produto
     */
    omit?: ProdutoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProdutoInclude<ExtArgs> | null
    /**
     * Filter, which Produto to fetch.
     */
    where?: ProdutoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Produtos to fetch.
     */
    orderBy?: ProdutoOrderByWithRelationInput | ProdutoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Produtos.
     */
    cursor?: ProdutoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Produtos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Produtos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Produtos.
     */
    distinct?: ProdutoScalarFieldEnum | ProdutoScalarFieldEnum[]
  }

  /**
   * Produto findMany
   */
  export type ProdutoFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Produto
     */
    select?: ProdutoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Produto
     */
    omit?: ProdutoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProdutoInclude<ExtArgs> | null
    /**
     * Filter, which Produtos to fetch.
     */
    where?: ProdutoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Produtos to fetch.
     */
    orderBy?: ProdutoOrderByWithRelationInput | ProdutoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Produtos.
     */
    cursor?: ProdutoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Produtos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Produtos.
     */
    skip?: number
    distinct?: ProdutoScalarFieldEnum | ProdutoScalarFieldEnum[]
  }

  /**
   * Produto create
   */
  export type ProdutoCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Produto
     */
    select?: ProdutoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Produto
     */
    omit?: ProdutoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProdutoInclude<ExtArgs> | null
    /**
     * The data needed to create a Produto.
     */
    data: XOR<ProdutoCreateInput, ProdutoUncheckedCreateInput>
  }

  /**
   * Produto createMany
   */
  export type ProdutoCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Produtos.
     */
    data: ProdutoCreateManyInput | ProdutoCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Produto createManyAndReturn
   */
  export type ProdutoCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Produto
     */
    select?: ProdutoSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Produto
     */
    omit?: ProdutoOmit<ExtArgs> | null
    /**
     * The data used to create many Produtos.
     */
    data: ProdutoCreateManyInput | ProdutoCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProdutoIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Produto update
   */
  export type ProdutoUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Produto
     */
    select?: ProdutoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Produto
     */
    omit?: ProdutoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProdutoInclude<ExtArgs> | null
    /**
     * The data needed to update a Produto.
     */
    data: XOR<ProdutoUpdateInput, ProdutoUncheckedUpdateInput>
    /**
     * Choose, which Produto to update.
     */
    where: ProdutoWhereUniqueInput
  }

  /**
   * Produto updateMany
   */
  export type ProdutoUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Produtos.
     */
    data: XOR<ProdutoUpdateManyMutationInput, ProdutoUncheckedUpdateManyInput>
    /**
     * Filter which Produtos to update
     */
    where?: ProdutoWhereInput
    /**
     * Limit how many Produtos to update.
     */
    limit?: number
  }

  /**
   * Produto updateManyAndReturn
   */
  export type ProdutoUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Produto
     */
    select?: ProdutoSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Produto
     */
    omit?: ProdutoOmit<ExtArgs> | null
    /**
     * The data used to update Produtos.
     */
    data: XOR<ProdutoUpdateManyMutationInput, ProdutoUncheckedUpdateManyInput>
    /**
     * Filter which Produtos to update
     */
    where?: ProdutoWhereInput
    /**
     * Limit how many Produtos to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProdutoIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Produto upsert
   */
  export type ProdutoUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Produto
     */
    select?: ProdutoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Produto
     */
    omit?: ProdutoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProdutoInclude<ExtArgs> | null
    /**
     * The filter to search for the Produto to update in case it exists.
     */
    where: ProdutoWhereUniqueInput
    /**
     * In case the Produto found by the `where` argument doesn't exist, create a new Produto with this data.
     */
    create: XOR<ProdutoCreateInput, ProdutoUncheckedCreateInput>
    /**
     * In case the Produto was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ProdutoUpdateInput, ProdutoUncheckedUpdateInput>
  }

  /**
   * Produto delete
   */
  export type ProdutoDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Produto
     */
    select?: ProdutoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Produto
     */
    omit?: ProdutoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProdutoInclude<ExtArgs> | null
    /**
     * Filter which Produto to delete.
     */
    where: ProdutoWhereUniqueInput
  }

  /**
   * Produto deleteMany
   */
  export type ProdutoDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Produtos to delete
     */
    where?: ProdutoWhereInput
    /**
     * Limit how many Produtos to delete.
     */
    limit?: number
  }

  /**
   * Produto.fornecedor
   */
  export type Produto$fornecedorArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Fornecedor
     */
    select?: FornecedorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Fornecedor
     */
    omit?: FornecedorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FornecedorInclude<ExtArgs> | null
    where?: FornecedorWhereInput
  }

  /**
   * Produto without action
   */
  export type ProdutoDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Produto
     */
    select?: ProdutoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Produto
     */
    omit?: ProdutoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProdutoInclude<ExtArgs> | null
  }


  /**
   * Model Venda
   */

  export type AggregateVenda = {
    _count: VendaCountAggregateOutputType | null
    _avg: VendaAvgAggregateOutputType | null
    _sum: VendaSumAggregateOutputType | null
    _min: VendaMinAggregateOutputType | null
    _max: VendaMaxAggregateOutputType | null
  }

  export type VendaAvgAggregateOutputType = {
    id: number | null
    clienteId: number | null
    custoProduto: number | null
    quantidade: number | null
    valorVenda: number | null
    valorFrete: number | null
    custoEnvio: number | null
    parcelas: number | null
    valorParcela: number | null
    taxaFinanceiraValor: number | null
    lucroLiquido: number | null
    antecipada: number | null
    excedeuLimite: number | null
    taxaNota: number | null
  }

  export type VendaSumAggregateOutputType = {
    id: number | null
    clienteId: number | null
    custoProduto: number | null
    quantidade: number | null
    valorVenda: number | null
    valorFrete: number | null
    custoEnvio: number | null
    parcelas: number | null
    valorParcela: number | null
    taxaFinanceiraValor: number | null
    lucroLiquido: number | null
    antecipada: number | null
    excedeuLimite: number | null
    taxaNota: number | null
  }

  export type VendaMinAggregateOutputType = {
    id: number | null
    uuid: string | null
    dataVenda: Date | null
    vendedor: string | null
    clienteId: number | null
    produtoNome: string | null
    custoProduto: number | null
    quantidade: number | null
    valorVenda: number | null
    valorFrete: number | null
    custoEnvio: number | null
    parcelas: number | null
    valorParcela: number | null
    taxaFinanceiraValor: number | null
    lucroLiquido: number | null
    antecipada: number | null
    excedeuLimite: number | null
    temNota: boolean | null
    taxaNota: number | null
    comprovantePdf: string | null
    descontoEmFolha: boolean | null
    assinaturaToken: string | null
    assinaturaStatus: string | null
    assinaturaEm: Date | null
    boleto: boolean | null
    asaasPaymentId: string | null
    boletoUrl: string | null
  }

  export type VendaMaxAggregateOutputType = {
    id: number | null
    uuid: string | null
    dataVenda: Date | null
    vendedor: string | null
    clienteId: number | null
    produtoNome: string | null
    custoProduto: number | null
    quantidade: number | null
    valorVenda: number | null
    valorFrete: number | null
    custoEnvio: number | null
    parcelas: number | null
    valorParcela: number | null
    taxaFinanceiraValor: number | null
    lucroLiquido: number | null
    antecipada: number | null
    excedeuLimite: number | null
    temNota: boolean | null
    taxaNota: number | null
    comprovantePdf: string | null
    descontoEmFolha: boolean | null
    assinaturaToken: string | null
    assinaturaStatus: string | null
    assinaturaEm: Date | null
    boleto: boolean | null
    asaasPaymentId: string | null
    boletoUrl: string | null
  }

  export type VendaCountAggregateOutputType = {
    id: number
    uuid: number
    dataVenda: number
    vendedor: number
    clienteId: number
    produtoNome: number
    custoProduto: number
    quantidade: number
    valorVenda: number
    valorFrete: number
    custoEnvio: number
    parcelas: number
    valorParcela: number
    taxaFinanceiraValor: number
    lucroLiquido: number
    antecipada: number
    excedeuLimite: number
    temNota: number
    taxaNota: number
    comprovantePdf: number
    descontoEmFolha: number
    assinaturaToken: number
    assinaturaStatus: number
    assinaturaEm: number
    boleto: number
    asaasPaymentId: number
    boletoUrl: number
    _all: number
  }


  export type VendaAvgAggregateInputType = {
    id?: true
    clienteId?: true
    custoProduto?: true
    quantidade?: true
    valorVenda?: true
    valorFrete?: true
    custoEnvio?: true
    parcelas?: true
    valorParcela?: true
    taxaFinanceiraValor?: true
    lucroLiquido?: true
    antecipada?: true
    excedeuLimite?: true
    taxaNota?: true
  }

  export type VendaSumAggregateInputType = {
    id?: true
    clienteId?: true
    custoProduto?: true
    quantidade?: true
    valorVenda?: true
    valorFrete?: true
    custoEnvio?: true
    parcelas?: true
    valorParcela?: true
    taxaFinanceiraValor?: true
    lucroLiquido?: true
    antecipada?: true
    excedeuLimite?: true
    taxaNota?: true
  }

  export type VendaMinAggregateInputType = {
    id?: true
    uuid?: true
    dataVenda?: true
    vendedor?: true
    clienteId?: true
    produtoNome?: true
    custoProduto?: true
    quantidade?: true
    valorVenda?: true
    valorFrete?: true
    custoEnvio?: true
    parcelas?: true
    valorParcela?: true
    taxaFinanceiraValor?: true
    lucroLiquido?: true
    antecipada?: true
    excedeuLimite?: true
    temNota?: true
    taxaNota?: true
    comprovantePdf?: true
    descontoEmFolha?: true
    assinaturaToken?: true
    assinaturaStatus?: true
    assinaturaEm?: true
    boleto?: true
    asaasPaymentId?: true
    boletoUrl?: true
  }

  export type VendaMaxAggregateInputType = {
    id?: true
    uuid?: true
    dataVenda?: true
    vendedor?: true
    clienteId?: true
    produtoNome?: true
    custoProduto?: true
    quantidade?: true
    valorVenda?: true
    valorFrete?: true
    custoEnvio?: true
    parcelas?: true
    valorParcela?: true
    taxaFinanceiraValor?: true
    lucroLiquido?: true
    antecipada?: true
    excedeuLimite?: true
    temNota?: true
    taxaNota?: true
    comprovantePdf?: true
    descontoEmFolha?: true
    assinaturaToken?: true
    assinaturaStatus?: true
    assinaturaEm?: true
    boleto?: true
    asaasPaymentId?: true
    boletoUrl?: true
  }

  export type VendaCountAggregateInputType = {
    id?: true
    uuid?: true
    dataVenda?: true
    vendedor?: true
    clienteId?: true
    produtoNome?: true
    custoProduto?: true
    quantidade?: true
    valorVenda?: true
    valorFrete?: true
    custoEnvio?: true
    parcelas?: true
    valorParcela?: true
    taxaFinanceiraValor?: true
    lucroLiquido?: true
    antecipada?: true
    excedeuLimite?: true
    temNota?: true
    taxaNota?: true
    comprovantePdf?: true
    descontoEmFolha?: true
    assinaturaToken?: true
    assinaturaStatus?: true
    assinaturaEm?: true
    boleto?: true
    asaasPaymentId?: true
    boletoUrl?: true
    _all?: true
  }

  export type VendaAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Venda to aggregate.
     */
    where?: VendaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Vendas to fetch.
     */
    orderBy?: VendaOrderByWithRelationInput | VendaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: VendaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Vendas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Vendas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Vendas
    **/
    _count?: true | VendaCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: VendaAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: VendaSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: VendaMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: VendaMaxAggregateInputType
  }

  export type GetVendaAggregateType<T extends VendaAggregateArgs> = {
        [P in keyof T & keyof AggregateVenda]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateVenda[P]>
      : GetScalarType<T[P], AggregateVenda[P]>
  }




  export type VendaGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: VendaWhereInput
    orderBy?: VendaOrderByWithAggregationInput | VendaOrderByWithAggregationInput[]
    by: VendaScalarFieldEnum[] | VendaScalarFieldEnum
    having?: VendaScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: VendaCountAggregateInputType | true
    _avg?: VendaAvgAggregateInputType
    _sum?: VendaSumAggregateInputType
    _min?: VendaMinAggregateInputType
    _max?: VendaMaxAggregateInputType
  }

  export type VendaGroupByOutputType = {
    id: number
    uuid: string | null
    dataVenda: Date
    vendedor: string | null
    clienteId: number | null
    produtoNome: string | null
    custoProduto: number | null
    quantidade: number | null
    valorVenda: number | null
    valorFrete: number | null
    custoEnvio: number | null
    parcelas: number | null
    valorParcela: number | null
    taxaFinanceiraValor: number | null
    lucroLiquido: number | null
    antecipada: number | null
    excedeuLimite: number | null
    temNota: boolean
    taxaNota: number | null
    comprovantePdf: string | null
    descontoEmFolha: boolean
    assinaturaToken: string | null
    assinaturaStatus: string | null
    assinaturaEm: Date | null
    boleto: boolean
    asaasPaymentId: string | null
    boletoUrl: string | null
    _count: VendaCountAggregateOutputType | null
    _avg: VendaAvgAggregateOutputType | null
    _sum: VendaSumAggregateOutputType | null
    _min: VendaMinAggregateOutputType | null
    _max: VendaMaxAggregateOutputType | null
  }

  type GetVendaGroupByPayload<T extends VendaGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<VendaGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof VendaGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], VendaGroupByOutputType[P]>
            : GetScalarType<T[P], VendaGroupByOutputType[P]>
        }
      >
    >


  export type VendaSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    uuid?: boolean
    dataVenda?: boolean
    vendedor?: boolean
    clienteId?: boolean
    produtoNome?: boolean
    custoProduto?: boolean
    quantidade?: boolean
    valorVenda?: boolean
    valorFrete?: boolean
    custoEnvio?: boolean
    parcelas?: boolean
    valorParcela?: boolean
    taxaFinanceiraValor?: boolean
    lucroLiquido?: boolean
    antecipada?: boolean
    excedeuLimite?: boolean
    temNota?: boolean
    taxaNota?: boolean
    comprovantePdf?: boolean
    descontoEmFolha?: boolean
    assinaturaToken?: boolean
    assinaturaStatus?: boolean
    assinaturaEm?: boolean
    boleto?: boolean
    asaasPaymentId?: boolean
    boletoUrl?: boolean
    cliente?: boolean | Venda$clienteArgs<ExtArgs>
    itens?: boolean | Venda$itensArgs<ExtArgs>
    parcelasVencimento?: boolean | Venda$parcelasVencimentoArgs<ExtArgs>
    documentos?: boolean | Venda$documentosArgs<ExtArgs>
    _count?: boolean | VendaCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["venda"]>

  export type VendaSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    uuid?: boolean
    dataVenda?: boolean
    vendedor?: boolean
    clienteId?: boolean
    produtoNome?: boolean
    custoProduto?: boolean
    quantidade?: boolean
    valorVenda?: boolean
    valorFrete?: boolean
    custoEnvio?: boolean
    parcelas?: boolean
    valorParcela?: boolean
    taxaFinanceiraValor?: boolean
    lucroLiquido?: boolean
    antecipada?: boolean
    excedeuLimite?: boolean
    temNota?: boolean
    taxaNota?: boolean
    comprovantePdf?: boolean
    descontoEmFolha?: boolean
    assinaturaToken?: boolean
    assinaturaStatus?: boolean
    assinaturaEm?: boolean
    boleto?: boolean
    asaasPaymentId?: boolean
    boletoUrl?: boolean
    cliente?: boolean | Venda$clienteArgs<ExtArgs>
  }, ExtArgs["result"]["venda"]>

  export type VendaSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    uuid?: boolean
    dataVenda?: boolean
    vendedor?: boolean
    clienteId?: boolean
    produtoNome?: boolean
    custoProduto?: boolean
    quantidade?: boolean
    valorVenda?: boolean
    valorFrete?: boolean
    custoEnvio?: boolean
    parcelas?: boolean
    valorParcela?: boolean
    taxaFinanceiraValor?: boolean
    lucroLiquido?: boolean
    antecipada?: boolean
    excedeuLimite?: boolean
    temNota?: boolean
    taxaNota?: boolean
    comprovantePdf?: boolean
    descontoEmFolha?: boolean
    assinaturaToken?: boolean
    assinaturaStatus?: boolean
    assinaturaEm?: boolean
    boleto?: boolean
    asaasPaymentId?: boolean
    boletoUrl?: boolean
    cliente?: boolean | Venda$clienteArgs<ExtArgs>
  }, ExtArgs["result"]["venda"]>

  export type VendaSelectScalar = {
    id?: boolean
    uuid?: boolean
    dataVenda?: boolean
    vendedor?: boolean
    clienteId?: boolean
    produtoNome?: boolean
    custoProduto?: boolean
    quantidade?: boolean
    valorVenda?: boolean
    valorFrete?: boolean
    custoEnvio?: boolean
    parcelas?: boolean
    valorParcela?: boolean
    taxaFinanceiraValor?: boolean
    lucroLiquido?: boolean
    antecipada?: boolean
    excedeuLimite?: boolean
    temNota?: boolean
    taxaNota?: boolean
    comprovantePdf?: boolean
    descontoEmFolha?: boolean
    assinaturaToken?: boolean
    assinaturaStatus?: boolean
    assinaturaEm?: boolean
    boleto?: boolean
    asaasPaymentId?: boolean
    boletoUrl?: boolean
  }

  export type VendaOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "uuid" | "dataVenda" | "vendedor" | "clienteId" | "produtoNome" | "custoProduto" | "quantidade" | "valorVenda" | "valorFrete" | "custoEnvio" | "parcelas" | "valorParcela" | "taxaFinanceiraValor" | "lucroLiquido" | "antecipada" | "excedeuLimite" | "temNota" | "taxaNota" | "comprovantePdf" | "descontoEmFolha" | "assinaturaToken" | "assinaturaStatus" | "assinaturaEm" | "boleto" | "asaasPaymentId" | "boletoUrl", ExtArgs["result"]["venda"]>
  export type VendaInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    cliente?: boolean | Venda$clienteArgs<ExtArgs>
    itens?: boolean | Venda$itensArgs<ExtArgs>
    parcelasVencimento?: boolean | Venda$parcelasVencimentoArgs<ExtArgs>
    documentos?: boolean | Venda$documentosArgs<ExtArgs>
    _count?: boolean | VendaCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type VendaIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    cliente?: boolean | Venda$clienteArgs<ExtArgs>
  }
  export type VendaIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    cliente?: boolean | Venda$clienteArgs<ExtArgs>
  }

  export type $VendaPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Venda"
    objects: {
      cliente: Prisma.$ClientePayload<ExtArgs> | null
      itens: Prisma.$ItemVendaPayload<ExtArgs>[]
      parcelasVencimento: Prisma.$ParcelaVencimentoPayload<ExtArgs>[]
      documentos: Prisma.$DocumentoPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      uuid: string | null
      dataVenda: Date
      vendedor: string | null
      clienteId: number | null
      produtoNome: string | null
      custoProduto: number | null
      quantidade: number | null
      valorVenda: number | null
      valorFrete: number | null
      custoEnvio: number | null
      parcelas: number | null
      valorParcela: number | null
      taxaFinanceiraValor: number | null
      lucroLiquido: number | null
      antecipada: number | null
      excedeuLimite: number | null
      temNota: boolean
      taxaNota: number | null
      comprovantePdf: string | null
      descontoEmFolha: boolean
      assinaturaToken: string | null
      assinaturaStatus: string | null
      assinaturaEm: Date | null
      boleto: boolean
      asaasPaymentId: string | null
      boletoUrl: string | null
    }, ExtArgs["result"]["venda"]>
    composites: {}
  }

  type VendaGetPayload<S extends boolean | null | undefined | VendaDefaultArgs> = $Result.GetResult<Prisma.$VendaPayload, S>

  type VendaCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<VendaFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: VendaCountAggregateInputType | true
    }

  export interface VendaDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Venda'], meta: { name: 'Venda' } }
    /**
     * Find zero or one Venda that matches the filter.
     * @param {VendaFindUniqueArgs} args - Arguments to find a Venda
     * @example
     * // Get one Venda
     * const venda = await prisma.venda.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends VendaFindUniqueArgs>(args: SelectSubset<T, VendaFindUniqueArgs<ExtArgs>>): Prisma__VendaClient<$Result.GetResult<Prisma.$VendaPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Venda that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {VendaFindUniqueOrThrowArgs} args - Arguments to find a Venda
     * @example
     * // Get one Venda
     * const venda = await prisma.venda.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends VendaFindUniqueOrThrowArgs>(args: SelectSubset<T, VendaFindUniqueOrThrowArgs<ExtArgs>>): Prisma__VendaClient<$Result.GetResult<Prisma.$VendaPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Venda that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VendaFindFirstArgs} args - Arguments to find a Venda
     * @example
     * // Get one Venda
     * const venda = await prisma.venda.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends VendaFindFirstArgs>(args?: SelectSubset<T, VendaFindFirstArgs<ExtArgs>>): Prisma__VendaClient<$Result.GetResult<Prisma.$VendaPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Venda that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VendaFindFirstOrThrowArgs} args - Arguments to find a Venda
     * @example
     * // Get one Venda
     * const venda = await prisma.venda.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends VendaFindFirstOrThrowArgs>(args?: SelectSubset<T, VendaFindFirstOrThrowArgs<ExtArgs>>): Prisma__VendaClient<$Result.GetResult<Prisma.$VendaPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Vendas that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VendaFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Vendas
     * const vendas = await prisma.venda.findMany()
     * 
     * // Get first 10 Vendas
     * const vendas = await prisma.venda.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const vendaWithIdOnly = await prisma.venda.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends VendaFindManyArgs>(args?: SelectSubset<T, VendaFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VendaPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Venda.
     * @param {VendaCreateArgs} args - Arguments to create a Venda.
     * @example
     * // Create one Venda
     * const Venda = await prisma.venda.create({
     *   data: {
     *     // ... data to create a Venda
     *   }
     * })
     * 
     */
    create<T extends VendaCreateArgs>(args: SelectSubset<T, VendaCreateArgs<ExtArgs>>): Prisma__VendaClient<$Result.GetResult<Prisma.$VendaPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Vendas.
     * @param {VendaCreateManyArgs} args - Arguments to create many Vendas.
     * @example
     * // Create many Vendas
     * const venda = await prisma.venda.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends VendaCreateManyArgs>(args?: SelectSubset<T, VendaCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Vendas and returns the data saved in the database.
     * @param {VendaCreateManyAndReturnArgs} args - Arguments to create many Vendas.
     * @example
     * // Create many Vendas
     * const venda = await prisma.venda.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Vendas and only return the `id`
     * const vendaWithIdOnly = await prisma.venda.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends VendaCreateManyAndReturnArgs>(args?: SelectSubset<T, VendaCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VendaPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Venda.
     * @param {VendaDeleteArgs} args - Arguments to delete one Venda.
     * @example
     * // Delete one Venda
     * const Venda = await prisma.venda.delete({
     *   where: {
     *     // ... filter to delete one Venda
     *   }
     * })
     * 
     */
    delete<T extends VendaDeleteArgs>(args: SelectSubset<T, VendaDeleteArgs<ExtArgs>>): Prisma__VendaClient<$Result.GetResult<Prisma.$VendaPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Venda.
     * @param {VendaUpdateArgs} args - Arguments to update one Venda.
     * @example
     * // Update one Venda
     * const venda = await prisma.venda.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends VendaUpdateArgs>(args: SelectSubset<T, VendaUpdateArgs<ExtArgs>>): Prisma__VendaClient<$Result.GetResult<Prisma.$VendaPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Vendas.
     * @param {VendaDeleteManyArgs} args - Arguments to filter Vendas to delete.
     * @example
     * // Delete a few Vendas
     * const { count } = await prisma.venda.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends VendaDeleteManyArgs>(args?: SelectSubset<T, VendaDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Vendas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VendaUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Vendas
     * const venda = await prisma.venda.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends VendaUpdateManyArgs>(args: SelectSubset<T, VendaUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Vendas and returns the data updated in the database.
     * @param {VendaUpdateManyAndReturnArgs} args - Arguments to update many Vendas.
     * @example
     * // Update many Vendas
     * const venda = await prisma.venda.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Vendas and only return the `id`
     * const vendaWithIdOnly = await prisma.venda.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends VendaUpdateManyAndReturnArgs>(args: SelectSubset<T, VendaUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VendaPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Venda.
     * @param {VendaUpsertArgs} args - Arguments to update or create a Venda.
     * @example
     * // Update or create a Venda
     * const venda = await prisma.venda.upsert({
     *   create: {
     *     // ... data to create a Venda
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Venda we want to update
     *   }
     * })
     */
    upsert<T extends VendaUpsertArgs>(args: SelectSubset<T, VendaUpsertArgs<ExtArgs>>): Prisma__VendaClient<$Result.GetResult<Prisma.$VendaPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Vendas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VendaCountArgs} args - Arguments to filter Vendas to count.
     * @example
     * // Count the number of Vendas
     * const count = await prisma.venda.count({
     *   where: {
     *     // ... the filter for the Vendas we want to count
     *   }
     * })
    **/
    count<T extends VendaCountArgs>(
      args?: Subset<T, VendaCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], VendaCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Venda.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VendaAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends VendaAggregateArgs>(args: Subset<T, VendaAggregateArgs>): Prisma.PrismaPromise<GetVendaAggregateType<T>>

    /**
     * Group by Venda.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VendaGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends VendaGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: VendaGroupByArgs['orderBy'] }
        : { orderBy?: VendaGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, VendaGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetVendaGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Venda model
   */
  readonly fields: VendaFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Venda.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__VendaClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    cliente<T extends Venda$clienteArgs<ExtArgs> = {}>(args?: Subset<T, Venda$clienteArgs<ExtArgs>>): Prisma__ClienteClient<$Result.GetResult<Prisma.$ClientePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    itens<T extends Venda$itensArgs<ExtArgs> = {}>(args?: Subset<T, Venda$itensArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ItemVendaPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    parcelasVencimento<T extends Venda$parcelasVencimentoArgs<ExtArgs> = {}>(args?: Subset<T, Venda$parcelasVencimentoArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ParcelaVencimentoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    documentos<T extends Venda$documentosArgs<ExtArgs> = {}>(args?: Subset<T, Venda$documentosArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DocumentoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Venda model
   */
  interface VendaFieldRefs {
    readonly id: FieldRef<"Venda", 'Int'>
    readonly uuid: FieldRef<"Venda", 'String'>
    readonly dataVenda: FieldRef<"Venda", 'DateTime'>
    readonly vendedor: FieldRef<"Venda", 'String'>
    readonly clienteId: FieldRef<"Venda", 'Int'>
    readonly produtoNome: FieldRef<"Venda", 'String'>
    readonly custoProduto: FieldRef<"Venda", 'Float'>
    readonly quantidade: FieldRef<"Venda", 'Int'>
    readonly valorVenda: FieldRef<"Venda", 'Float'>
    readonly valorFrete: FieldRef<"Venda", 'Float'>
    readonly custoEnvio: FieldRef<"Venda", 'Float'>
    readonly parcelas: FieldRef<"Venda", 'Int'>
    readonly valorParcela: FieldRef<"Venda", 'Float'>
    readonly taxaFinanceiraValor: FieldRef<"Venda", 'Float'>
    readonly lucroLiquido: FieldRef<"Venda", 'Float'>
    readonly antecipada: FieldRef<"Venda", 'Int'>
    readonly excedeuLimite: FieldRef<"Venda", 'Int'>
    readonly temNota: FieldRef<"Venda", 'Boolean'>
    readonly taxaNota: FieldRef<"Venda", 'Float'>
    readonly comprovantePdf: FieldRef<"Venda", 'String'>
    readonly descontoEmFolha: FieldRef<"Venda", 'Boolean'>
    readonly assinaturaToken: FieldRef<"Venda", 'String'>
    readonly assinaturaStatus: FieldRef<"Venda", 'String'>
    readonly assinaturaEm: FieldRef<"Venda", 'DateTime'>
    readonly boleto: FieldRef<"Venda", 'Boolean'>
    readonly asaasPaymentId: FieldRef<"Venda", 'String'>
    readonly boletoUrl: FieldRef<"Venda", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Venda findUnique
   */
  export type VendaFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Venda
     */
    select?: VendaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Venda
     */
    omit?: VendaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VendaInclude<ExtArgs> | null
    /**
     * Filter, which Venda to fetch.
     */
    where: VendaWhereUniqueInput
  }

  /**
   * Venda findUniqueOrThrow
   */
  export type VendaFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Venda
     */
    select?: VendaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Venda
     */
    omit?: VendaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VendaInclude<ExtArgs> | null
    /**
     * Filter, which Venda to fetch.
     */
    where: VendaWhereUniqueInput
  }

  /**
   * Venda findFirst
   */
  export type VendaFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Venda
     */
    select?: VendaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Venda
     */
    omit?: VendaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VendaInclude<ExtArgs> | null
    /**
     * Filter, which Venda to fetch.
     */
    where?: VendaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Vendas to fetch.
     */
    orderBy?: VendaOrderByWithRelationInput | VendaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Vendas.
     */
    cursor?: VendaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Vendas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Vendas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Vendas.
     */
    distinct?: VendaScalarFieldEnum | VendaScalarFieldEnum[]
  }

  /**
   * Venda findFirstOrThrow
   */
  export type VendaFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Venda
     */
    select?: VendaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Venda
     */
    omit?: VendaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VendaInclude<ExtArgs> | null
    /**
     * Filter, which Venda to fetch.
     */
    where?: VendaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Vendas to fetch.
     */
    orderBy?: VendaOrderByWithRelationInput | VendaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Vendas.
     */
    cursor?: VendaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Vendas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Vendas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Vendas.
     */
    distinct?: VendaScalarFieldEnum | VendaScalarFieldEnum[]
  }

  /**
   * Venda findMany
   */
  export type VendaFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Venda
     */
    select?: VendaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Venda
     */
    omit?: VendaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VendaInclude<ExtArgs> | null
    /**
     * Filter, which Vendas to fetch.
     */
    where?: VendaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Vendas to fetch.
     */
    orderBy?: VendaOrderByWithRelationInput | VendaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Vendas.
     */
    cursor?: VendaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Vendas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Vendas.
     */
    skip?: number
    distinct?: VendaScalarFieldEnum | VendaScalarFieldEnum[]
  }

  /**
   * Venda create
   */
  export type VendaCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Venda
     */
    select?: VendaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Venda
     */
    omit?: VendaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VendaInclude<ExtArgs> | null
    /**
     * The data needed to create a Venda.
     */
    data: XOR<VendaCreateInput, VendaUncheckedCreateInput>
  }

  /**
   * Venda createMany
   */
  export type VendaCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Vendas.
     */
    data: VendaCreateManyInput | VendaCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Venda createManyAndReturn
   */
  export type VendaCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Venda
     */
    select?: VendaSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Venda
     */
    omit?: VendaOmit<ExtArgs> | null
    /**
     * The data used to create many Vendas.
     */
    data: VendaCreateManyInput | VendaCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VendaIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Venda update
   */
  export type VendaUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Venda
     */
    select?: VendaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Venda
     */
    omit?: VendaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VendaInclude<ExtArgs> | null
    /**
     * The data needed to update a Venda.
     */
    data: XOR<VendaUpdateInput, VendaUncheckedUpdateInput>
    /**
     * Choose, which Venda to update.
     */
    where: VendaWhereUniqueInput
  }

  /**
   * Venda updateMany
   */
  export type VendaUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Vendas.
     */
    data: XOR<VendaUpdateManyMutationInput, VendaUncheckedUpdateManyInput>
    /**
     * Filter which Vendas to update
     */
    where?: VendaWhereInput
    /**
     * Limit how many Vendas to update.
     */
    limit?: number
  }

  /**
   * Venda updateManyAndReturn
   */
  export type VendaUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Venda
     */
    select?: VendaSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Venda
     */
    omit?: VendaOmit<ExtArgs> | null
    /**
     * The data used to update Vendas.
     */
    data: XOR<VendaUpdateManyMutationInput, VendaUncheckedUpdateManyInput>
    /**
     * Filter which Vendas to update
     */
    where?: VendaWhereInput
    /**
     * Limit how many Vendas to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VendaIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Venda upsert
   */
  export type VendaUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Venda
     */
    select?: VendaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Venda
     */
    omit?: VendaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VendaInclude<ExtArgs> | null
    /**
     * The filter to search for the Venda to update in case it exists.
     */
    where: VendaWhereUniqueInput
    /**
     * In case the Venda found by the `where` argument doesn't exist, create a new Venda with this data.
     */
    create: XOR<VendaCreateInput, VendaUncheckedCreateInput>
    /**
     * In case the Venda was found with the provided `where` argument, update it with this data.
     */
    update: XOR<VendaUpdateInput, VendaUncheckedUpdateInput>
  }

  /**
   * Venda delete
   */
  export type VendaDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Venda
     */
    select?: VendaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Venda
     */
    omit?: VendaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VendaInclude<ExtArgs> | null
    /**
     * Filter which Venda to delete.
     */
    where: VendaWhereUniqueInput
  }

  /**
   * Venda deleteMany
   */
  export type VendaDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Vendas to delete
     */
    where?: VendaWhereInput
    /**
     * Limit how many Vendas to delete.
     */
    limit?: number
  }

  /**
   * Venda.cliente
   */
  export type Venda$clienteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Cliente
     */
    select?: ClienteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Cliente
     */
    omit?: ClienteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ClienteInclude<ExtArgs> | null
    where?: ClienteWhereInput
  }

  /**
   * Venda.itens
   */
  export type Venda$itensArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemVenda
     */
    select?: ItemVendaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemVenda
     */
    omit?: ItemVendaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemVendaInclude<ExtArgs> | null
    where?: ItemVendaWhereInput
    orderBy?: ItemVendaOrderByWithRelationInput | ItemVendaOrderByWithRelationInput[]
    cursor?: ItemVendaWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ItemVendaScalarFieldEnum | ItemVendaScalarFieldEnum[]
  }

  /**
   * Venda.parcelasVencimento
   */
  export type Venda$parcelasVencimentoArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParcelaVencimento
     */
    select?: ParcelaVencimentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParcelaVencimento
     */
    omit?: ParcelaVencimentoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParcelaVencimentoInclude<ExtArgs> | null
    where?: ParcelaVencimentoWhereInput
    orderBy?: ParcelaVencimentoOrderByWithRelationInput | ParcelaVencimentoOrderByWithRelationInput[]
    cursor?: ParcelaVencimentoWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ParcelaVencimentoScalarFieldEnum | ParcelaVencimentoScalarFieldEnum[]
  }

  /**
   * Venda.documentos
   */
  export type Venda$documentosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Documento
     */
    select?: DocumentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Documento
     */
    omit?: DocumentoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentoInclude<ExtArgs> | null
    where?: DocumentoWhereInput
    orderBy?: DocumentoOrderByWithRelationInput | DocumentoOrderByWithRelationInput[]
    cursor?: DocumentoWhereUniqueInput
    take?: number
    skip?: number
    distinct?: DocumentoScalarFieldEnum | DocumentoScalarFieldEnum[]
  }

  /**
   * Venda without action
   */
  export type VendaDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Venda
     */
    select?: VendaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Venda
     */
    omit?: VendaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VendaInclude<ExtArgs> | null
  }


  /**
   * Model Documento
   */

  export type AggregateDocumento = {
    _count: DocumentoCountAggregateOutputType | null
    _avg: DocumentoAvgAggregateOutputType | null
    _sum: DocumentoSumAggregateOutputType | null
    _min: DocumentoMinAggregateOutputType | null
    _max: DocumentoMaxAggregateOutputType | null
  }

  export type DocumentoAvgAggregateOutputType = {
    id: number | null
    vendaId: number | null
    tamanhoBytes: number | null
  }

  export type DocumentoSumAggregateOutputType = {
    id: number | null
    vendaId: number | null
    tamanhoBytes: number | null
  }

  export type DocumentoMinAggregateOutputType = {
    id: number | null
    vendaId: number | null
    tipo: string | null
    mimeType: string | null
    conteudo: Bytes | null
    tamanhoBytes: number | null
    criadoEm: Date | null
  }

  export type DocumentoMaxAggregateOutputType = {
    id: number | null
    vendaId: number | null
    tipo: string | null
    mimeType: string | null
    conteudo: Bytes | null
    tamanhoBytes: number | null
    criadoEm: Date | null
  }

  export type DocumentoCountAggregateOutputType = {
    id: number
    vendaId: number
    tipo: number
    mimeType: number
    conteudo: number
    tamanhoBytes: number
    criadoEm: number
    _all: number
  }


  export type DocumentoAvgAggregateInputType = {
    id?: true
    vendaId?: true
    tamanhoBytes?: true
  }

  export type DocumentoSumAggregateInputType = {
    id?: true
    vendaId?: true
    tamanhoBytes?: true
  }

  export type DocumentoMinAggregateInputType = {
    id?: true
    vendaId?: true
    tipo?: true
    mimeType?: true
    conteudo?: true
    tamanhoBytes?: true
    criadoEm?: true
  }

  export type DocumentoMaxAggregateInputType = {
    id?: true
    vendaId?: true
    tipo?: true
    mimeType?: true
    conteudo?: true
    tamanhoBytes?: true
    criadoEm?: true
  }

  export type DocumentoCountAggregateInputType = {
    id?: true
    vendaId?: true
    tipo?: true
    mimeType?: true
    conteudo?: true
    tamanhoBytes?: true
    criadoEm?: true
    _all?: true
  }

  export type DocumentoAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Documento to aggregate.
     */
    where?: DocumentoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Documentos to fetch.
     */
    orderBy?: DocumentoOrderByWithRelationInput | DocumentoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: DocumentoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Documentos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Documentos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Documentos
    **/
    _count?: true | DocumentoCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: DocumentoAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: DocumentoSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: DocumentoMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: DocumentoMaxAggregateInputType
  }

  export type GetDocumentoAggregateType<T extends DocumentoAggregateArgs> = {
        [P in keyof T & keyof AggregateDocumento]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateDocumento[P]>
      : GetScalarType<T[P], AggregateDocumento[P]>
  }




  export type DocumentoGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: DocumentoWhereInput
    orderBy?: DocumentoOrderByWithAggregationInput | DocumentoOrderByWithAggregationInput[]
    by: DocumentoScalarFieldEnum[] | DocumentoScalarFieldEnum
    having?: DocumentoScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: DocumentoCountAggregateInputType | true
    _avg?: DocumentoAvgAggregateInputType
    _sum?: DocumentoSumAggregateInputType
    _min?: DocumentoMinAggregateInputType
    _max?: DocumentoMaxAggregateInputType
  }

  export type DocumentoGroupByOutputType = {
    id: number
    vendaId: number | null
    tipo: string
    mimeType: string
    conteudo: Bytes
    tamanhoBytes: number
    criadoEm: Date
    _count: DocumentoCountAggregateOutputType | null
    _avg: DocumentoAvgAggregateOutputType | null
    _sum: DocumentoSumAggregateOutputType | null
    _min: DocumentoMinAggregateOutputType | null
    _max: DocumentoMaxAggregateOutputType | null
  }

  type GetDocumentoGroupByPayload<T extends DocumentoGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<DocumentoGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof DocumentoGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], DocumentoGroupByOutputType[P]>
            : GetScalarType<T[P], DocumentoGroupByOutputType[P]>
        }
      >
    >


  export type DocumentoSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    vendaId?: boolean
    tipo?: boolean
    mimeType?: boolean
    conteudo?: boolean
    tamanhoBytes?: boolean
    criadoEm?: boolean
    venda?: boolean | Documento$vendaArgs<ExtArgs>
  }, ExtArgs["result"]["documento"]>

  export type DocumentoSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    vendaId?: boolean
    tipo?: boolean
    mimeType?: boolean
    conteudo?: boolean
    tamanhoBytes?: boolean
    criadoEm?: boolean
    venda?: boolean | Documento$vendaArgs<ExtArgs>
  }, ExtArgs["result"]["documento"]>

  export type DocumentoSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    vendaId?: boolean
    tipo?: boolean
    mimeType?: boolean
    conteudo?: boolean
    tamanhoBytes?: boolean
    criadoEm?: boolean
    venda?: boolean | Documento$vendaArgs<ExtArgs>
  }, ExtArgs["result"]["documento"]>

  export type DocumentoSelectScalar = {
    id?: boolean
    vendaId?: boolean
    tipo?: boolean
    mimeType?: boolean
    conteudo?: boolean
    tamanhoBytes?: boolean
    criadoEm?: boolean
  }

  export type DocumentoOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "vendaId" | "tipo" | "mimeType" | "conteudo" | "tamanhoBytes" | "criadoEm", ExtArgs["result"]["documento"]>
  export type DocumentoInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    venda?: boolean | Documento$vendaArgs<ExtArgs>
  }
  export type DocumentoIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    venda?: boolean | Documento$vendaArgs<ExtArgs>
  }
  export type DocumentoIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    venda?: boolean | Documento$vendaArgs<ExtArgs>
  }

  export type $DocumentoPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Documento"
    objects: {
      venda: Prisma.$VendaPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      vendaId: number | null
      tipo: string
      mimeType: string
      conteudo: Prisma.Bytes
      tamanhoBytes: number
      criadoEm: Date
    }, ExtArgs["result"]["documento"]>
    composites: {}
  }

  type DocumentoGetPayload<S extends boolean | null | undefined | DocumentoDefaultArgs> = $Result.GetResult<Prisma.$DocumentoPayload, S>

  type DocumentoCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<DocumentoFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: DocumentoCountAggregateInputType | true
    }

  export interface DocumentoDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Documento'], meta: { name: 'Documento' } }
    /**
     * Find zero or one Documento that matches the filter.
     * @param {DocumentoFindUniqueArgs} args - Arguments to find a Documento
     * @example
     * // Get one Documento
     * const documento = await prisma.documento.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends DocumentoFindUniqueArgs>(args: SelectSubset<T, DocumentoFindUniqueArgs<ExtArgs>>): Prisma__DocumentoClient<$Result.GetResult<Prisma.$DocumentoPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Documento that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {DocumentoFindUniqueOrThrowArgs} args - Arguments to find a Documento
     * @example
     * // Get one Documento
     * const documento = await prisma.documento.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends DocumentoFindUniqueOrThrowArgs>(args: SelectSubset<T, DocumentoFindUniqueOrThrowArgs<ExtArgs>>): Prisma__DocumentoClient<$Result.GetResult<Prisma.$DocumentoPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Documento that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DocumentoFindFirstArgs} args - Arguments to find a Documento
     * @example
     * // Get one Documento
     * const documento = await prisma.documento.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends DocumentoFindFirstArgs>(args?: SelectSubset<T, DocumentoFindFirstArgs<ExtArgs>>): Prisma__DocumentoClient<$Result.GetResult<Prisma.$DocumentoPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Documento that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DocumentoFindFirstOrThrowArgs} args - Arguments to find a Documento
     * @example
     * // Get one Documento
     * const documento = await prisma.documento.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends DocumentoFindFirstOrThrowArgs>(args?: SelectSubset<T, DocumentoFindFirstOrThrowArgs<ExtArgs>>): Prisma__DocumentoClient<$Result.GetResult<Prisma.$DocumentoPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Documentos that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DocumentoFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Documentos
     * const documentos = await prisma.documento.findMany()
     * 
     * // Get first 10 Documentos
     * const documentos = await prisma.documento.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const documentoWithIdOnly = await prisma.documento.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends DocumentoFindManyArgs>(args?: SelectSubset<T, DocumentoFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DocumentoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Documento.
     * @param {DocumentoCreateArgs} args - Arguments to create a Documento.
     * @example
     * // Create one Documento
     * const Documento = await prisma.documento.create({
     *   data: {
     *     // ... data to create a Documento
     *   }
     * })
     * 
     */
    create<T extends DocumentoCreateArgs>(args: SelectSubset<T, DocumentoCreateArgs<ExtArgs>>): Prisma__DocumentoClient<$Result.GetResult<Prisma.$DocumentoPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Documentos.
     * @param {DocumentoCreateManyArgs} args - Arguments to create many Documentos.
     * @example
     * // Create many Documentos
     * const documento = await prisma.documento.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends DocumentoCreateManyArgs>(args?: SelectSubset<T, DocumentoCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Documentos and returns the data saved in the database.
     * @param {DocumentoCreateManyAndReturnArgs} args - Arguments to create many Documentos.
     * @example
     * // Create many Documentos
     * const documento = await prisma.documento.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Documentos and only return the `id`
     * const documentoWithIdOnly = await prisma.documento.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends DocumentoCreateManyAndReturnArgs>(args?: SelectSubset<T, DocumentoCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DocumentoPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Documento.
     * @param {DocumentoDeleteArgs} args - Arguments to delete one Documento.
     * @example
     * // Delete one Documento
     * const Documento = await prisma.documento.delete({
     *   where: {
     *     // ... filter to delete one Documento
     *   }
     * })
     * 
     */
    delete<T extends DocumentoDeleteArgs>(args: SelectSubset<T, DocumentoDeleteArgs<ExtArgs>>): Prisma__DocumentoClient<$Result.GetResult<Prisma.$DocumentoPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Documento.
     * @param {DocumentoUpdateArgs} args - Arguments to update one Documento.
     * @example
     * // Update one Documento
     * const documento = await prisma.documento.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends DocumentoUpdateArgs>(args: SelectSubset<T, DocumentoUpdateArgs<ExtArgs>>): Prisma__DocumentoClient<$Result.GetResult<Prisma.$DocumentoPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Documentos.
     * @param {DocumentoDeleteManyArgs} args - Arguments to filter Documentos to delete.
     * @example
     * // Delete a few Documentos
     * const { count } = await prisma.documento.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends DocumentoDeleteManyArgs>(args?: SelectSubset<T, DocumentoDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Documentos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DocumentoUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Documentos
     * const documento = await prisma.documento.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends DocumentoUpdateManyArgs>(args: SelectSubset<T, DocumentoUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Documentos and returns the data updated in the database.
     * @param {DocumentoUpdateManyAndReturnArgs} args - Arguments to update many Documentos.
     * @example
     * // Update many Documentos
     * const documento = await prisma.documento.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Documentos and only return the `id`
     * const documentoWithIdOnly = await prisma.documento.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends DocumentoUpdateManyAndReturnArgs>(args: SelectSubset<T, DocumentoUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DocumentoPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Documento.
     * @param {DocumentoUpsertArgs} args - Arguments to update or create a Documento.
     * @example
     * // Update or create a Documento
     * const documento = await prisma.documento.upsert({
     *   create: {
     *     // ... data to create a Documento
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Documento we want to update
     *   }
     * })
     */
    upsert<T extends DocumentoUpsertArgs>(args: SelectSubset<T, DocumentoUpsertArgs<ExtArgs>>): Prisma__DocumentoClient<$Result.GetResult<Prisma.$DocumentoPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Documentos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DocumentoCountArgs} args - Arguments to filter Documentos to count.
     * @example
     * // Count the number of Documentos
     * const count = await prisma.documento.count({
     *   where: {
     *     // ... the filter for the Documentos we want to count
     *   }
     * })
    **/
    count<T extends DocumentoCountArgs>(
      args?: Subset<T, DocumentoCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], DocumentoCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Documento.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DocumentoAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends DocumentoAggregateArgs>(args: Subset<T, DocumentoAggregateArgs>): Prisma.PrismaPromise<GetDocumentoAggregateType<T>>

    /**
     * Group by Documento.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DocumentoGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends DocumentoGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: DocumentoGroupByArgs['orderBy'] }
        : { orderBy?: DocumentoGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, DocumentoGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetDocumentoGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Documento model
   */
  readonly fields: DocumentoFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Documento.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__DocumentoClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    venda<T extends Documento$vendaArgs<ExtArgs> = {}>(args?: Subset<T, Documento$vendaArgs<ExtArgs>>): Prisma__VendaClient<$Result.GetResult<Prisma.$VendaPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Documento model
   */
  interface DocumentoFieldRefs {
    readonly id: FieldRef<"Documento", 'Int'>
    readonly vendaId: FieldRef<"Documento", 'Int'>
    readonly tipo: FieldRef<"Documento", 'String'>
    readonly mimeType: FieldRef<"Documento", 'String'>
    readonly conteudo: FieldRef<"Documento", 'Bytes'>
    readonly tamanhoBytes: FieldRef<"Documento", 'Int'>
    readonly criadoEm: FieldRef<"Documento", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Documento findUnique
   */
  export type DocumentoFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Documento
     */
    select?: DocumentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Documento
     */
    omit?: DocumentoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentoInclude<ExtArgs> | null
    /**
     * Filter, which Documento to fetch.
     */
    where: DocumentoWhereUniqueInput
  }

  /**
   * Documento findUniqueOrThrow
   */
  export type DocumentoFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Documento
     */
    select?: DocumentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Documento
     */
    omit?: DocumentoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentoInclude<ExtArgs> | null
    /**
     * Filter, which Documento to fetch.
     */
    where: DocumentoWhereUniqueInput
  }

  /**
   * Documento findFirst
   */
  export type DocumentoFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Documento
     */
    select?: DocumentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Documento
     */
    omit?: DocumentoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentoInclude<ExtArgs> | null
    /**
     * Filter, which Documento to fetch.
     */
    where?: DocumentoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Documentos to fetch.
     */
    orderBy?: DocumentoOrderByWithRelationInput | DocumentoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Documentos.
     */
    cursor?: DocumentoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Documentos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Documentos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Documentos.
     */
    distinct?: DocumentoScalarFieldEnum | DocumentoScalarFieldEnum[]
  }

  /**
   * Documento findFirstOrThrow
   */
  export type DocumentoFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Documento
     */
    select?: DocumentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Documento
     */
    omit?: DocumentoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentoInclude<ExtArgs> | null
    /**
     * Filter, which Documento to fetch.
     */
    where?: DocumentoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Documentos to fetch.
     */
    orderBy?: DocumentoOrderByWithRelationInput | DocumentoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Documentos.
     */
    cursor?: DocumentoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Documentos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Documentos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Documentos.
     */
    distinct?: DocumentoScalarFieldEnum | DocumentoScalarFieldEnum[]
  }

  /**
   * Documento findMany
   */
  export type DocumentoFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Documento
     */
    select?: DocumentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Documento
     */
    omit?: DocumentoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentoInclude<ExtArgs> | null
    /**
     * Filter, which Documentos to fetch.
     */
    where?: DocumentoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Documentos to fetch.
     */
    orderBy?: DocumentoOrderByWithRelationInput | DocumentoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Documentos.
     */
    cursor?: DocumentoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Documentos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Documentos.
     */
    skip?: number
    distinct?: DocumentoScalarFieldEnum | DocumentoScalarFieldEnum[]
  }

  /**
   * Documento create
   */
  export type DocumentoCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Documento
     */
    select?: DocumentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Documento
     */
    omit?: DocumentoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentoInclude<ExtArgs> | null
    /**
     * The data needed to create a Documento.
     */
    data: XOR<DocumentoCreateInput, DocumentoUncheckedCreateInput>
  }

  /**
   * Documento createMany
   */
  export type DocumentoCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Documentos.
     */
    data: DocumentoCreateManyInput | DocumentoCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Documento createManyAndReturn
   */
  export type DocumentoCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Documento
     */
    select?: DocumentoSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Documento
     */
    omit?: DocumentoOmit<ExtArgs> | null
    /**
     * The data used to create many Documentos.
     */
    data: DocumentoCreateManyInput | DocumentoCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentoIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Documento update
   */
  export type DocumentoUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Documento
     */
    select?: DocumentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Documento
     */
    omit?: DocumentoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentoInclude<ExtArgs> | null
    /**
     * The data needed to update a Documento.
     */
    data: XOR<DocumentoUpdateInput, DocumentoUncheckedUpdateInput>
    /**
     * Choose, which Documento to update.
     */
    where: DocumentoWhereUniqueInput
  }

  /**
   * Documento updateMany
   */
  export type DocumentoUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Documentos.
     */
    data: XOR<DocumentoUpdateManyMutationInput, DocumentoUncheckedUpdateManyInput>
    /**
     * Filter which Documentos to update
     */
    where?: DocumentoWhereInput
    /**
     * Limit how many Documentos to update.
     */
    limit?: number
  }

  /**
   * Documento updateManyAndReturn
   */
  export type DocumentoUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Documento
     */
    select?: DocumentoSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Documento
     */
    omit?: DocumentoOmit<ExtArgs> | null
    /**
     * The data used to update Documentos.
     */
    data: XOR<DocumentoUpdateManyMutationInput, DocumentoUncheckedUpdateManyInput>
    /**
     * Filter which Documentos to update
     */
    where?: DocumentoWhereInput
    /**
     * Limit how many Documentos to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentoIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Documento upsert
   */
  export type DocumentoUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Documento
     */
    select?: DocumentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Documento
     */
    omit?: DocumentoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentoInclude<ExtArgs> | null
    /**
     * The filter to search for the Documento to update in case it exists.
     */
    where: DocumentoWhereUniqueInput
    /**
     * In case the Documento found by the `where` argument doesn't exist, create a new Documento with this data.
     */
    create: XOR<DocumentoCreateInput, DocumentoUncheckedCreateInput>
    /**
     * In case the Documento was found with the provided `where` argument, update it with this data.
     */
    update: XOR<DocumentoUpdateInput, DocumentoUncheckedUpdateInput>
  }

  /**
   * Documento delete
   */
  export type DocumentoDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Documento
     */
    select?: DocumentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Documento
     */
    omit?: DocumentoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentoInclude<ExtArgs> | null
    /**
     * Filter which Documento to delete.
     */
    where: DocumentoWhereUniqueInput
  }

  /**
   * Documento deleteMany
   */
  export type DocumentoDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Documentos to delete
     */
    where?: DocumentoWhereInput
    /**
     * Limit how many Documentos to delete.
     */
    limit?: number
  }

  /**
   * Documento.venda
   */
  export type Documento$vendaArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Venda
     */
    select?: VendaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Venda
     */
    omit?: VendaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VendaInclude<ExtArgs> | null
    where?: VendaWhereInput
  }

  /**
   * Documento without action
   */
  export type DocumentoDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Documento
     */
    select?: DocumentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Documento
     */
    omit?: DocumentoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentoInclude<ExtArgs> | null
  }


  /**
   * Model ItemVenda
   */

  export type AggregateItemVenda = {
    _count: ItemVendaCountAggregateOutputType | null
    _avg: ItemVendaAvgAggregateOutputType | null
    _sum: ItemVendaSumAggregateOutputType | null
    _min: ItemVendaMinAggregateOutputType | null
    _max: ItemVendaMaxAggregateOutputType | null
  }

  export type ItemVendaAvgAggregateOutputType = {
    id: number | null
    vendaId: number | null
    custoProduto: number | null
    valorVenda: number | null
    quantidade: number | null
    subtotal: number | null
  }

  export type ItemVendaSumAggregateOutputType = {
    id: number | null
    vendaId: number | null
    custoProduto: number | null
    valorVenda: number | null
    quantidade: number | null
    subtotal: number | null
  }

  export type ItemVendaMinAggregateOutputType = {
    id: number | null
    vendaId: number | null
    produtoNome: string | null
    custoProduto: number | null
    valorVenda: number | null
    quantidade: number | null
    subtotal: number | null
  }

  export type ItemVendaMaxAggregateOutputType = {
    id: number | null
    vendaId: number | null
    produtoNome: string | null
    custoProduto: number | null
    valorVenda: number | null
    quantidade: number | null
    subtotal: number | null
  }

  export type ItemVendaCountAggregateOutputType = {
    id: number
    vendaId: number
    produtoNome: number
    custoProduto: number
    valorVenda: number
    quantidade: number
    subtotal: number
    _all: number
  }


  export type ItemVendaAvgAggregateInputType = {
    id?: true
    vendaId?: true
    custoProduto?: true
    valorVenda?: true
    quantidade?: true
    subtotal?: true
  }

  export type ItemVendaSumAggregateInputType = {
    id?: true
    vendaId?: true
    custoProduto?: true
    valorVenda?: true
    quantidade?: true
    subtotal?: true
  }

  export type ItemVendaMinAggregateInputType = {
    id?: true
    vendaId?: true
    produtoNome?: true
    custoProduto?: true
    valorVenda?: true
    quantidade?: true
    subtotal?: true
  }

  export type ItemVendaMaxAggregateInputType = {
    id?: true
    vendaId?: true
    produtoNome?: true
    custoProduto?: true
    valorVenda?: true
    quantidade?: true
    subtotal?: true
  }

  export type ItemVendaCountAggregateInputType = {
    id?: true
    vendaId?: true
    produtoNome?: true
    custoProduto?: true
    valorVenda?: true
    quantidade?: true
    subtotal?: true
    _all?: true
  }

  export type ItemVendaAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ItemVenda to aggregate.
     */
    where?: ItemVendaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ItemVendas to fetch.
     */
    orderBy?: ItemVendaOrderByWithRelationInput | ItemVendaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ItemVendaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ItemVendas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ItemVendas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ItemVendas
    **/
    _count?: true | ItemVendaCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ItemVendaAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ItemVendaSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ItemVendaMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ItemVendaMaxAggregateInputType
  }

  export type GetItemVendaAggregateType<T extends ItemVendaAggregateArgs> = {
        [P in keyof T & keyof AggregateItemVenda]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateItemVenda[P]>
      : GetScalarType<T[P], AggregateItemVenda[P]>
  }




  export type ItemVendaGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ItemVendaWhereInput
    orderBy?: ItemVendaOrderByWithAggregationInput | ItemVendaOrderByWithAggregationInput[]
    by: ItemVendaScalarFieldEnum[] | ItemVendaScalarFieldEnum
    having?: ItemVendaScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ItemVendaCountAggregateInputType | true
    _avg?: ItemVendaAvgAggregateInputType
    _sum?: ItemVendaSumAggregateInputType
    _min?: ItemVendaMinAggregateInputType
    _max?: ItemVendaMaxAggregateInputType
  }

  export type ItemVendaGroupByOutputType = {
    id: number
    vendaId: number
    produtoNome: string
    custoProduto: number
    valorVenda: number
    quantidade: number
    subtotal: number
    _count: ItemVendaCountAggregateOutputType | null
    _avg: ItemVendaAvgAggregateOutputType | null
    _sum: ItemVendaSumAggregateOutputType | null
    _min: ItemVendaMinAggregateOutputType | null
    _max: ItemVendaMaxAggregateOutputType | null
  }

  type GetItemVendaGroupByPayload<T extends ItemVendaGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ItemVendaGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ItemVendaGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ItemVendaGroupByOutputType[P]>
            : GetScalarType<T[P], ItemVendaGroupByOutputType[P]>
        }
      >
    >


  export type ItemVendaSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    vendaId?: boolean
    produtoNome?: boolean
    custoProduto?: boolean
    valorVenda?: boolean
    quantidade?: boolean
    subtotal?: boolean
    venda?: boolean | VendaDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["itemVenda"]>

  export type ItemVendaSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    vendaId?: boolean
    produtoNome?: boolean
    custoProduto?: boolean
    valorVenda?: boolean
    quantidade?: boolean
    subtotal?: boolean
    venda?: boolean | VendaDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["itemVenda"]>

  export type ItemVendaSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    vendaId?: boolean
    produtoNome?: boolean
    custoProduto?: boolean
    valorVenda?: boolean
    quantidade?: boolean
    subtotal?: boolean
    venda?: boolean | VendaDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["itemVenda"]>

  export type ItemVendaSelectScalar = {
    id?: boolean
    vendaId?: boolean
    produtoNome?: boolean
    custoProduto?: boolean
    valorVenda?: boolean
    quantidade?: boolean
    subtotal?: boolean
  }

  export type ItemVendaOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "vendaId" | "produtoNome" | "custoProduto" | "valorVenda" | "quantidade" | "subtotal", ExtArgs["result"]["itemVenda"]>
  export type ItemVendaInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    venda?: boolean | VendaDefaultArgs<ExtArgs>
  }
  export type ItemVendaIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    venda?: boolean | VendaDefaultArgs<ExtArgs>
  }
  export type ItemVendaIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    venda?: boolean | VendaDefaultArgs<ExtArgs>
  }

  export type $ItemVendaPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ItemVenda"
    objects: {
      venda: Prisma.$VendaPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      vendaId: number
      produtoNome: string
      custoProduto: number
      valorVenda: number
      quantidade: number
      subtotal: number
    }, ExtArgs["result"]["itemVenda"]>
    composites: {}
  }

  type ItemVendaGetPayload<S extends boolean | null | undefined | ItemVendaDefaultArgs> = $Result.GetResult<Prisma.$ItemVendaPayload, S>

  type ItemVendaCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ItemVendaFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ItemVendaCountAggregateInputType | true
    }

  export interface ItemVendaDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ItemVenda'], meta: { name: 'ItemVenda' } }
    /**
     * Find zero or one ItemVenda that matches the filter.
     * @param {ItemVendaFindUniqueArgs} args - Arguments to find a ItemVenda
     * @example
     * // Get one ItemVenda
     * const itemVenda = await prisma.itemVenda.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ItemVendaFindUniqueArgs>(args: SelectSubset<T, ItemVendaFindUniqueArgs<ExtArgs>>): Prisma__ItemVendaClient<$Result.GetResult<Prisma.$ItemVendaPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ItemVenda that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ItemVendaFindUniqueOrThrowArgs} args - Arguments to find a ItemVenda
     * @example
     * // Get one ItemVenda
     * const itemVenda = await prisma.itemVenda.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ItemVendaFindUniqueOrThrowArgs>(args: SelectSubset<T, ItemVendaFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ItemVendaClient<$Result.GetResult<Prisma.$ItemVendaPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ItemVenda that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ItemVendaFindFirstArgs} args - Arguments to find a ItemVenda
     * @example
     * // Get one ItemVenda
     * const itemVenda = await prisma.itemVenda.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ItemVendaFindFirstArgs>(args?: SelectSubset<T, ItemVendaFindFirstArgs<ExtArgs>>): Prisma__ItemVendaClient<$Result.GetResult<Prisma.$ItemVendaPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ItemVenda that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ItemVendaFindFirstOrThrowArgs} args - Arguments to find a ItemVenda
     * @example
     * // Get one ItemVenda
     * const itemVenda = await prisma.itemVenda.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ItemVendaFindFirstOrThrowArgs>(args?: SelectSubset<T, ItemVendaFindFirstOrThrowArgs<ExtArgs>>): Prisma__ItemVendaClient<$Result.GetResult<Prisma.$ItemVendaPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ItemVendas that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ItemVendaFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ItemVendas
     * const itemVendas = await prisma.itemVenda.findMany()
     * 
     * // Get first 10 ItemVendas
     * const itemVendas = await prisma.itemVenda.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const itemVendaWithIdOnly = await prisma.itemVenda.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ItemVendaFindManyArgs>(args?: SelectSubset<T, ItemVendaFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ItemVendaPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ItemVenda.
     * @param {ItemVendaCreateArgs} args - Arguments to create a ItemVenda.
     * @example
     * // Create one ItemVenda
     * const ItemVenda = await prisma.itemVenda.create({
     *   data: {
     *     // ... data to create a ItemVenda
     *   }
     * })
     * 
     */
    create<T extends ItemVendaCreateArgs>(args: SelectSubset<T, ItemVendaCreateArgs<ExtArgs>>): Prisma__ItemVendaClient<$Result.GetResult<Prisma.$ItemVendaPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ItemVendas.
     * @param {ItemVendaCreateManyArgs} args - Arguments to create many ItemVendas.
     * @example
     * // Create many ItemVendas
     * const itemVenda = await prisma.itemVenda.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ItemVendaCreateManyArgs>(args?: SelectSubset<T, ItemVendaCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ItemVendas and returns the data saved in the database.
     * @param {ItemVendaCreateManyAndReturnArgs} args - Arguments to create many ItemVendas.
     * @example
     * // Create many ItemVendas
     * const itemVenda = await prisma.itemVenda.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ItemVendas and only return the `id`
     * const itemVendaWithIdOnly = await prisma.itemVenda.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ItemVendaCreateManyAndReturnArgs>(args?: SelectSubset<T, ItemVendaCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ItemVendaPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ItemVenda.
     * @param {ItemVendaDeleteArgs} args - Arguments to delete one ItemVenda.
     * @example
     * // Delete one ItemVenda
     * const ItemVenda = await prisma.itemVenda.delete({
     *   where: {
     *     // ... filter to delete one ItemVenda
     *   }
     * })
     * 
     */
    delete<T extends ItemVendaDeleteArgs>(args: SelectSubset<T, ItemVendaDeleteArgs<ExtArgs>>): Prisma__ItemVendaClient<$Result.GetResult<Prisma.$ItemVendaPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ItemVenda.
     * @param {ItemVendaUpdateArgs} args - Arguments to update one ItemVenda.
     * @example
     * // Update one ItemVenda
     * const itemVenda = await prisma.itemVenda.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ItemVendaUpdateArgs>(args: SelectSubset<T, ItemVendaUpdateArgs<ExtArgs>>): Prisma__ItemVendaClient<$Result.GetResult<Prisma.$ItemVendaPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ItemVendas.
     * @param {ItemVendaDeleteManyArgs} args - Arguments to filter ItemVendas to delete.
     * @example
     * // Delete a few ItemVendas
     * const { count } = await prisma.itemVenda.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ItemVendaDeleteManyArgs>(args?: SelectSubset<T, ItemVendaDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ItemVendas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ItemVendaUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ItemVendas
     * const itemVenda = await prisma.itemVenda.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ItemVendaUpdateManyArgs>(args: SelectSubset<T, ItemVendaUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ItemVendas and returns the data updated in the database.
     * @param {ItemVendaUpdateManyAndReturnArgs} args - Arguments to update many ItemVendas.
     * @example
     * // Update many ItemVendas
     * const itemVenda = await prisma.itemVenda.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ItemVendas and only return the `id`
     * const itemVendaWithIdOnly = await prisma.itemVenda.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ItemVendaUpdateManyAndReturnArgs>(args: SelectSubset<T, ItemVendaUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ItemVendaPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ItemVenda.
     * @param {ItemVendaUpsertArgs} args - Arguments to update or create a ItemVenda.
     * @example
     * // Update or create a ItemVenda
     * const itemVenda = await prisma.itemVenda.upsert({
     *   create: {
     *     // ... data to create a ItemVenda
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ItemVenda we want to update
     *   }
     * })
     */
    upsert<T extends ItemVendaUpsertArgs>(args: SelectSubset<T, ItemVendaUpsertArgs<ExtArgs>>): Prisma__ItemVendaClient<$Result.GetResult<Prisma.$ItemVendaPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ItemVendas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ItemVendaCountArgs} args - Arguments to filter ItemVendas to count.
     * @example
     * // Count the number of ItemVendas
     * const count = await prisma.itemVenda.count({
     *   where: {
     *     // ... the filter for the ItemVendas we want to count
     *   }
     * })
    **/
    count<T extends ItemVendaCountArgs>(
      args?: Subset<T, ItemVendaCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ItemVendaCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ItemVenda.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ItemVendaAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ItemVendaAggregateArgs>(args: Subset<T, ItemVendaAggregateArgs>): Prisma.PrismaPromise<GetItemVendaAggregateType<T>>

    /**
     * Group by ItemVenda.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ItemVendaGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ItemVendaGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ItemVendaGroupByArgs['orderBy'] }
        : { orderBy?: ItemVendaGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ItemVendaGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetItemVendaGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ItemVenda model
   */
  readonly fields: ItemVendaFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ItemVenda.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ItemVendaClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    venda<T extends VendaDefaultArgs<ExtArgs> = {}>(args?: Subset<T, VendaDefaultArgs<ExtArgs>>): Prisma__VendaClient<$Result.GetResult<Prisma.$VendaPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ItemVenda model
   */
  interface ItemVendaFieldRefs {
    readonly id: FieldRef<"ItemVenda", 'Int'>
    readonly vendaId: FieldRef<"ItemVenda", 'Int'>
    readonly produtoNome: FieldRef<"ItemVenda", 'String'>
    readonly custoProduto: FieldRef<"ItemVenda", 'Float'>
    readonly valorVenda: FieldRef<"ItemVenda", 'Float'>
    readonly quantidade: FieldRef<"ItemVenda", 'Int'>
    readonly subtotal: FieldRef<"ItemVenda", 'Float'>
  }
    

  // Custom InputTypes
  /**
   * ItemVenda findUnique
   */
  export type ItemVendaFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemVenda
     */
    select?: ItemVendaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemVenda
     */
    omit?: ItemVendaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemVendaInclude<ExtArgs> | null
    /**
     * Filter, which ItemVenda to fetch.
     */
    where: ItemVendaWhereUniqueInput
  }

  /**
   * ItemVenda findUniqueOrThrow
   */
  export type ItemVendaFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemVenda
     */
    select?: ItemVendaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemVenda
     */
    omit?: ItemVendaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemVendaInclude<ExtArgs> | null
    /**
     * Filter, which ItemVenda to fetch.
     */
    where: ItemVendaWhereUniqueInput
  }

  /**
   * ItemVenda findFirst
   */
  export type ItemVendaFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemVenda
     */
    select?: ItemVendaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemVenda
     */
    omit?: ItemVendaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemVendaInclude<ExtArgs> | null
    /**
     * Filter, which ItemVenda to fetch.
     */
    where?: ItemVendaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ItemVendas to fetch.
     */
    orderBy?: ItemVendaOrderByWithRelationInput | ItemVendaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ItemVendas.
     */
    cursor?: ItemVendaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ItemVendas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ItemVendas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ItemVendas.
     */
    distinct?: ItemVendaScalarFieldEnum | ItemVendaScalarFieldEnum[]
  }

  /**
   * ItemVenda findFirstOrThrow
   */
  export type ItemVendaFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemVenda
     */
    select?: ItemVendaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemVenda
     */
    omit?: ItemVendaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemVendaInclude<ExtArgs> | null
    /**
     * Filter, which ItemVenda to fetch.
     */
    where?: ItemVendaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ItemVendas to fetch.
     */
    orderBy?: ItemVendaOrderByWithRelationInput | ItemVendaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ItemVendas.
     */
    cursor?: ItemVendaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ItemVendas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ItemVendas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ItemVendas.
     */
    distinct?: ItemVendaScalarFieldEnum | ItemVendaScalarFieldEnum[]
  }

  /**
   * ItemVenda findMany
   */
  export type ItemVendaFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemVenda
     */
    select?: ItemVendaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemVenda
     */
    omit?: ItemVendaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemVendaInclude<ExtArgs> | null
    /**
     * Filter, which ItemVendas to fetch.
     */
    where?: ItemVendaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ItemVendas to fetch.
     */
    orderBy?: ItemVendaOrderByWithRelationInput | ItemVendaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ItemVendas.
     */
    cursor?: ItemVendaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ItemVendas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ItemVendas.
     */
    skip?: number
    distinct?: ItemVendaScalarFieldEnum | ItemVendaScalarFieldEnum[]
  }

  /**
   * ItemVenda create
   */
  export type ItemVendaCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemVenda
     */
    select?: ItemVendaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemVenda
     */
    omit?: ItemVendaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemVendaInclude<ExtArgs> | null
    /**
     * The data needed to create a ItemVenda.
     */
    data: XOR<ItemVendaCreateInput, ItemVendaUncheckedCreateInput>
  }

  /**
   * ItemVenda createMany
   */
  export type ItemVendaCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ItemVendas.
     */
    data: ItemVendaCreateManyInput | ItemVendaCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ItemVenda createManyAndReturn
   */
  export type ItemVendaCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemVenda
     */
    select?: ItemVendaSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ItemVenda
     */
    omit?: ItemVendaOmit<ExtArgs> | null
    /**
     * The data used to create many ItemVendas.
     */
    data: ItemVendaCreateManyInput | ItemVendaCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemVendaIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ItemVenda update
   */
  export type ItemVendaUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemVenda
     */
    select?: ItemVendaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemVenda
     */
    omit?: ItemVendaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemVendaInclude<ExtArgs> | null
    /**
     * The data needed to update a ItemVenda.
     */
    data: XOR<ItemVendaUpdateInput, ItemVendaUncheckedUpdateInput>
    /**
     * Choose, which ItemVenda to update.
     */
    where: ItemVendaWhereUniqueInput
  }

  /**
   * ItemVenda updateMany
   */
  export type ItemVendaUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ItemVendas.
     */
    data: XOR<ItemVendaUpdateManyMutationInput, ItemVendaUncheckedUpdateManyInput>
    /**
     * Filter which ItemVendas to update
     */
    where?: ItemVendaWhereInput
    /**
     * Limit how many ItemVendas to update.
     */
    limit?: number
  }

  /**
   * ItemVenda updateManyAndReturn
   */
  export type ItemVendaUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemVenda
     */
    select?: ItemVendaSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ItemVenda
     */
    omit?: ItemVendaOmit<ExtArgs> | null
    /**
     * The data used to update ItemVendas.
     */
    data: XOR<ItemVendaUpdateManyMutationInput, ItemVendaUncheckedUpdateManyInput>
    /**
     * Filter which ItemVendas to update
     */
    where?: ItemVendaWhereInput
    /**
     * Limit how many ItemVendas to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemVendaIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * ItemVenda upsert
   */
  export type ItemVendaUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemVenda
     */
    select?: ItemVendaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemVenda
     */
    omit?: ItemVendaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemVendaInclude<ExtArgs> | null
    /**
     * The filter to search for the ItemVenda to update in case it exists.
     */
    where: ItemVendaWhereUniqueInput
    /**
     * In case the ItemVenda found by the `where` argument doesn't exist, create a new ItemVenda with this data.
     */
    create: XOR<ItemVendaCreateInput, ItemVendaUncheckedCreateInput>
    /**
     * In case the ItemVenda was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ItemVendaUpdateInput, ItemVendaUncheckedUpdateInput>
  }

  /**
   * ItemVenda delete
   */
  export type ItemVendaDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemVenda
     */
    select?: ItemVendaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemVenda
     */
    omit?: ItemVendaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemVendaInclude<ExtArgs> | null
    /**
     * Filter which ItemVenda to delete.
     */
    where: ItemVendaWhereUniqueInput
  }

  /**
   * ItemVenda deleteMany
   */
  export type ItemVendaDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ItemVendas to delete
     */
    where?: ItemVendaWhereInput
    /**
     * Limit how many ItemVendas to delete.
     */
    limit?: number
  }

  /**
   * ItemVenda without action
   */
  export type ItemVendaDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemVenda
     */
    select?: ItemVendaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemVenda
     */
    omit?: ItemVendaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemVendaInclude<ExtArgs> | null
  }


  /**
   * Model ParcelaVencimento
   */

  export type AggregateParcelaVencimento = {
    _count: ParcelaVencimentoCountAggregateOutputType | null
    _avg: ParcelaVencimentoAvgAggregateOutputType | null
    _sum: ParcelaVencimentoSumAggregateOutputType | null
    _min: ParcelaVencimentoMinAggregateOutputType | null
    _max: ParcelaVencimentoMaxAggregateOutputType | null
  }

  export type ParcelaVencimentoAvgAggregateOutputType = {
    id: number | null
    vendaId: number | null
    numeroParcela: number | null
    valorParcela: number | null
  }

  export type ParcelaVencimentoSumAggregateOutputType = {
    id: number | null
    vendaId: number | null
    numeroParcela: number | null
    valorParcela: number | null
  }

  export type ParcelaVencimentoMinAggregateOutputType = {
    id: number | null
    vendaId: number | null
    numeroParcela: number | null
    dataVencimento: Date | null
    valorParcela: number | null
    paga: boolean | null
    dataPagamento: Date | null
  }

  export type ParcelaVencimentoMaxAggregateOutputType = {
    id: number | null
    vendaId: number | null
    numeroParcela: number | null
    dataVencimento: Date | null
    valorParcela: number | null
    paga: boolean | null
    dataPagamento: Date | null
  }

  export type ParcelaVencimentoCountAggregateOutputType = {
    id: number
    vendaId: number
    numeroParcela: number
    dataVencimento: number
    valorParcela: number
    paga: number
    dataPagamento: number
    _all: number
  }


  export type ParcelaVencimentoAvgAggregateInputType = {
    id?: true
    vendaId?: true
    numeroParcela?: true
    valorParcela?: true
  }

  export type ParcelaVencimentoSumAggregateInputType = {
    id?: true
    vendaId?: true
    numeroParcela?: true
    valorParcela?: true
  }

  export type ParcelaVencimentoMinAggregateInputType = {
    id?: true
    vendaId?: true
    numeroParcela?: true
    dataVencimento?: true
    valorParcela?: true
    paga?: true
    dataPagamento?: true
  }

  export type ParcelaVencimentoMaxAggregateInputType = {
    id?: true
    vendaId?: true
    numeroParcela?: true
    dataVencimento?: true
    valorParcela?: true
    paga?: true
    dataPagamento?: true
  }

  export type ParcelaVencimentoCountAggregateInputType = {
    id?: true
    vendaId?: true
    numeroParcela?: true
    dataVencimento?: true
    valorParcela?: true
    paga?: true
    dataPagamento?: true
    _all?: true
  }

  export type ParcelaVencimentoAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ParcelaVencimento to aggregate.
     */
    where?: ParcelaVencimentoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ParcelaVencimentos to fetch.
     */
    orderBy?: ParcelaVencimentoOrderByWithRelationInput | ParcelaVencimentoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ParcelaVencimentoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ParcelaVencimentos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ParcelaVencimentos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ParcelaVencimentos
    **/
    _count?: true | ParcelaVencimentoCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ParcelaVencimentoAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ParcelaVencimentoSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ParcelaVencimentoMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ParcelaVencimentoMaxAggregateInputType
  }

  export type GetParcelaVencimentoAggregateType<T extends ParcelaVencimentoAggregateArgs> = {
        [P in keyof T & keyof AggregateParcelaVencimento]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateParcelaVencimento[P]>
      : GetScalarType<T[P], AggregateParcelaVencimento[P]>
  }




  export type ParcelaVencimentoGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ParcelaVencimentoWhereInput
    orderBy?: ParcelaVencimentoOrderByWithAggregationInput | ParcelaVencimentoOrderByWithAggregationInput[]
    by: ParcelaVencimentoScalarFieldEnum[] | ParcelaVencimentoScalarFieldEnum
    having?: ParcelaVencimentoScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ParcelaVencimentoCountAggregateInputType | true
    _avg?: ParcelaVencimentoAvgAggregateInputType
    _sum?: ParcelaVencimentoSumAggregateInputType
    _min?: ParcelaVencimentoMinAggregateInputType
    _max?: ParcelaVencimentoMaxAggregateInputType
  }

  export type ParcelaVencimentoGroupByOutputType = {
    id: number
    vendaId: number
    numeroParcela: number
    dataVencimento: Date
    valorParcela: number
    paga: boolean
    dataPagamento: Date | null
    _count: ParcelaVencimentoCountAggregateOutputType | null
    _avg: ParcelaVencimentoAvgAggregateOutputType | null
    _sum: ParcelaVencimentoSumAggregateOutputType | null
    _min: ParcelaVencimentoMinAggregateOutputType | null
    _max: ParcelaVencimentoMaxAggregateOutputType | null
  }

  type GetParcelaVencimentoGroupByPayload<T extends ParcelaVencimentoGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ParcelaVencimentoGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ParcelaVencimentoGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ParcelaVencimentoGroupByOutputType[P]>
            : GetScalarType<T[P], ParcelaVencimentoGroupByOutputType[P]>
        }
      >
    >


  export type ParcelaVencimentoSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    vendaId?: boolean
    numeroParcela?: boolean
    dataVencimento?: boolean
    valorParcela?: boolean
    paga?: boolean
    dataPagamento?: boolean
    venda?: boolean | VendaDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["parcelaVencimento"]>

  export type ParcelaVencimentoSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    vendaId?: boolean
    numeroParcela?: boolean
    dataVencimento?: boolean
    valorParcela?: boolean
    paga?: boolean
    dataPagamento?: boolean
    venda?: boolean | VendaDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["parcelaVencimento"]>

  export type ParcelaVencimentoSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    vendaId?: boolean
    numeroParcela?: boolean
    dataVencimento?: boolean
    valorParcela?: boolean
    paga?: boolean
    dataPagamento?: boolean
    venda?: boolean | VendaDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["parcelaVencimento"]>

  export type ParcelaVencimentoSelectScalar = {
    id?: boolean
    vendaId?: boolean
    numeroParcela?: boolean
    dataVencimento?: boolean
    valorParcela?: boolean
    paga?: boolean
    dataPagamento?: boolean
  }

  export type ParcelaVencimentoOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "vendaId" | "numeroParcela" | "dataVencimento" | "valorParcela" | "paga" | "dataPagamento", ExtArgs["result"]["parcelaVencimento"]>
  export type ParcelaVencimentoInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    venda?: boolean | VendaDefaultArgs<ExtArgs>
  }
  export type ParcelaVencimentoIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    venda?: boolean | VendaDefaultArgs<ExtArgs>
  }
  export type ParcelaVencimentoIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    venda?: boolean | VendaDefaultArgs<ExtArgs>
  }

  export type $ParcelaVencimentoPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ParcelaVencimento"
    objects: {
      venda: Prisma.$VendaPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      vendaId: number
      numeroParcela: number
      dataVencimento: Date
      valorParcela: number
      paga: boolean
      dataPagamento: Date | null
    }, ExtArgs["result"]["parcelaVencimento"]>
    composites: {}
  }

  type ParcelaVencimentoGetPayload<S extends boolean | null | undefined | ParcelaVencimentoDefaultArgs> = $Result.GetResult<Prisma.$ParcelaVencimentoPayload, S>

  type ParcelaVencimentoCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ParcelaVencimentoFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ParcelaVencimentoCountAggregateInputType | true
    }

  export interface ParcelaVencimentoDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ParcelaVencimento'], meta: { name: 'ParcelaVencimento' } }
    /**
     * Find zero or one ParcelaVencimento that matches the filter.
     * @param {ParcelaVencimentoFindUniqueArgs} args - Arguments to find a ParcelaVencimento
     * @example
     * // Get one ParcelaVencimento
     * const parcelaVencimento = await prisma.parcelaVencimento.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ParcelaVencimentoFindUniqueArgs>(args: SelectSubset<T, ParcelaVencimentoFindUniqueArgs<ExtArgs>>): Prisma__ParcelaVencimentoClient<$Result.GetResult<Prisma.$ParcelaVencimentoPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ParcelaVencimento that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ParcelaVencimentoFindUniqueOrThrowArgs} args - Arguments to find a ParcelaVencimento
     * @example
     * // Get one ParcelaVencimento
     * const parcelaVencimento = await prisma.parcelaVencimento.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ParcelaVencimentoFindUniqueOrThrowArgs>(args: SelectSubset<T, ParcelaVencimentoFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ParcelaVencimentoClient<$Result.GetResult<Prisma.$ParcelaVencimentoPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ParcelaVencimento that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ParcelaVencimentoFindFirstArgs} args - Arguments to find a ParcelaVencimento
     * @example
     * // Get one ParcelaVencimento
     * const parcelaVencimento = await prisma.parcelaVencimento.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ParcelaVencimentoFindFirstArgs>(args?: SelectSubset<T, ParcelaVencimentoFindFirstArgs<ExtArgs>>): Prisma__ParcelaVencimentoClient<$Result.GetResult<Prisma.$ParcelaVencimentoPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ParcelaVencimento that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ParcelaVencimentoFindFirstOrThrowArgs} args - Arguments to find a ParcelaVencimento
     * @example
     * // Get one ParcelaVencimento
     * const parcelaVencimento = await prisma.parcelaVencimento.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ParcelaVencimentoFindFirstOrThrowArgs>(args?: SelectSubset<T, ParcelaVencimentoFindFirstOrThrowArgs<ExtArgs>>): Prisma__ParcelaVencimentoClient<$Result.GetResult<Prisma.$ParcelaVencimentoPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ParcelaVencimentos that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ParcelaVencimentoFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ParcelaVencimentos
     * const parcelaVencimentos = await prisma.parcelaVencimento.findMany()
     * 
     * // Get first 10 ParcelaVencimentos
     * const parcelaVencimentos = await prisma.parcelaVencimento.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const parcelaVencimentoWithIdOnly = await prisma.parcelaVencimento.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ParcelaVencimentoFindManyArgs>(args?: SelectSubset<T, ParcelaVencimentoFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ParcelaVencimentoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ParcelaVencimento.
     * @param {ParcelaVencimentoCreateArgs} args - Arguments to create a ParcelaVencimento.
     * @example
     * // Create one ParcelaVencimento
     * const ParcelaVencimento = await prisma.parcelaVencimento.create({
     *   data: {
     *     // ... data to create a ParcelaVencimento
     *   }
     * })
     * 
     */
    create<T extends ParcelaVencimentoCreateArgs>(args: SelectSubset<T, ParcelaVencimentoCreateArgs<ExtArgs>>): Prisma__ParcelaVencimentoClient<$Result.GetResult<Prisma.$ParcelaVencimentoPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ParcelaVencimentos.
     * @param {ParcelaVencimentoCreateManyArgs} args - Arguments to create many ParcelaVencimentos.
     * @example
     * // Create many ParcelaVencimentos
     * const parcelaVencimento = await prisma.parcelaVencimento.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ParcelaVencimentoCreateManyArgs>(args?: SelectSubset<T, ParcelaVencimentoCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ParcelaVencimentos and returns the data saved in the database.
     * @param {ParcelaVencimentoCreateManyAndReturnArgs} args - Arguments to create many ParcelaVencimentos.
     * @example
     * // Create many ParcelaVencimentos
     * const parcelaVencimento = await prisma.parcelaVencimento.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ParcelaVencimentos and only return the `id`
     * const parcelaVencimentoWithIdOnly = await prisma.parcelaVencimento.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ParcelaVencimentoCreateManyAndReturnArgs>(args?: SelectSubset<T, ParcelaVencimentoCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ParcelaVencimentoPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ParcelaVencimento.
     * @param {ParcelaVencimentoDeleteArgs} args - Arguments to delete one ParcelaVencimento.
     * @example
     * // Delete one ParcelaVencimento
     * const ParcelaVencimento = await prisma.parcelaVencimento.delete({
     *   where: {
     *     // ... filter to delete one ParcelaVencimento
     *   }
     * })
     * 
     */
    delete<T extends ParcelaVencimentoDeleteArgs>(args: SelectSubset<T, ParcelaVencimentoDeleteArgs<ExtArgs>>): Prisma__ParcelaVencimentoClient<$Result.GetResult<Prisma.$ParcelaVencimentoPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ParcelaVencimento.
     * @param {ParcelaVencimentoUpdateArgs} args - Arguments to update one ParcelaVencimento.
     * @example
     * // Update one ParcelaVencimento
     * const parcelaVencimento = await prisma.parcelaVencimento.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ParcelaVencimentoUpdateArgs>(args: SelectSubset<T, ParcelaVencimentoUpdateArgs<ExtArgs>>): Prisma__ParcelaVencimentoClient<$Result.GetResult<Prisma.$ParcelaVencimentoPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ParcelaVencimentos.
     * @param {ParcelaVencimentoDeleteManyArgs} args - Arguments to filter ParcelaVencimentos to delete.
     * @example
     * // Delete a few ParcelaVencimentos
     * const { count } = await prisma.parcelaVencimento.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ParcelaVencimentoDeleteManyArgs>(args?: SelectSubset<T, ParcelaVencimentoDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ParcelaVencimentos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ParcelaVencimentoUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ParcelaVencimentos
     * const parcelaVencimento = await prisma.parcelaVencimento.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ParcelaVencimentoUpdateManyArgs>(args: SelectSubset<T, ParcelaVencimentoUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ParcelaVencimentos and returns the data updated in the database.
     * @param {ParcelaVencimentoUpdateManyAndReturnArgs} args - Arguments to update many ParcelaVencimentos.
     * @example
     * // Update many ParcelaVencimentos
     * const parcelaVencimento = await prisma.parcelaVencimento.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ParcelaVencimentos and only return the `id`
     * const parcelaVencimentoWithIdOnly = await prisma.parcelaVencimento.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ParcelaVencimentoUpdateManyAndReturnArgs>(args: SelectSubset<T, ParcelaVencimentoUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ParcelaVencimentoPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ParcelaVencimento.
     * @param {ParcelaVencimentoUpsertArgs} args - Arguments to update or create a ParcelaVencimento.
     * @example
     * // Update or create a ParcelaVencimento
     * const parcelaVencimento = await prisma.parcelaVencimento.upsert({
     *   create: {
     *     // ... data to create a ParcelaVencimento
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ParcelaVencimento we want to update
     *   }
     * })
     */
    upsert<T extends ParcelaVencimentoUpsertArgs>(args: SelectSubset<T, ParcelaVencimentoUpsertArgs<ExtArgs>>): Prisma__ParcelaVencimentoClient<$Result.GetResult<Prisma.$ParcelaVencimentoPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ParcelaVencimentos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ParcelaVencimentoCountArgs} args - Arguments to filter ParcelaVencimentos to count.
     * @example
     * // Count the number of ParcelaVencimentos
     * const count = await prisma.parcelaVencimento.count({
     *   where: {
     *     // ... the filter for the ParcelaVencimentos we want to count
     *   }
     * })
    **/
    count<T extends ParcelaVencimentoCountArgs>(
      args?: Subset<T, ParcelaVencimentoCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ParcelaVencimentoCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ParcelaVencimento.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ParcelaVencimentoAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ParcelaVencimentoAggregateArgs>(args: Subset<T, ParcelaVencimentoAggregateArgs>): Prisma.PrismaPromise<GetParcelaVencimentoAggregateType<T>>

    /**
     * Group by ParcelaVencimento.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ParcelaVencimentoGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ParcelaVencimentoGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ParcelaVencimentoGroupByArgs['orderBy'] }
        : { orderBy?: ParcelaVencimentoGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ParcelaVencimentoGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetParcelaVencimentoGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ParcelaVencimento model
   */
  readonly fields: ParcelaVencimentoFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ParcelaVencimento.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ParcelaVencimentoClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    venda<T extends VendaDefaultArgs<ExtArgs> = {}>(args?: Subset<T, VendaDefaultArgs<ExtArgs>>): Prisma__VendaClient<$Result.GetResult<Prisma.$VendaPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ParcelaVencimento model
   */
  interface ParcelaVencimentoFieldRefs {
    readonly id: FieldRef<"ParcelaVencimento", 'Int'>
    readonly vendaId: FieldRef<"ParcelaVencimento", 'Int'>
    readonly numeroParcela: FieldRef<"ParcelaVencimento", 'Int'>
    readonly dataVencimento: FieldRef<"ParcelaVencimento", 'DateTime'>
    readonly valorParcela: FieldRef<"ParcelaVencimento", 'Float'>
    readonly paga: FieldRef<"ParcelaVencimento", 'Boolean'>
    readonly dataPagamento: FieldRef<"ParcelaVencimento", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ParcelaVencimento findUnique
   */
  export type ParcelaVencimentoFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParcelaVencimento
     */
    select?: ParcelaVencimentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParcelaVencimento
     */
    omit?: ParcelaVencimentoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParcelaVencimentoInclude<ExtArgs> | null
    /**
     * Filter, which ParcelaVencimento to fetch.
     */
    where: ParcelaVencimentoWhereUniqueInput
  }

  /**
   * ParcelaVencimento findUniqueOrThrow
   */
  export type ParcelaVencimentoFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParcelaVencimento
     */
    select?: ParcelaVencimentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParcelaVencimento
     */
    omit?: ParcelaVencimentoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParcelaVencimentoInclude<ExtArgs> | null
    /**
     * Filter, which ParcelaVencimento to fetch.
     */
    where: ParcelaVencimentoWhereUniqueInput
  }

  /**
   * ParcelaVencimento findFirst
   */
  export type ParcelaVencimentoFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParcelaVencimento
     */
    select?: ParcelaVencimentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParcelaVencimento
     */
    omit?: ParcelaVencimentoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParcelaVencimentoInclude<ExtArgs> | null
    /**
     * Filter, which ParcelaVencimento to fetch.
     */
    where?: ParcelaVencimentoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ParcelaVencimentos to fetch.
     */
    orderBy?: ParcelaVencimentoOrderByWithRelationInput | ParcelaVencimentoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ParcelaVencimentos.
     */
    cursor?: ParcelaVencimentoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ParcelaVencimentos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ParcelaVencimentos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ParcelaVencimentos.
     */
    distinct?: ParcelaVencimentoScalarFieldEnum | ParcelaVencimentoScalarFieldEnum[]
  }

  /**
   * ParcelaVencimento findFirstOrThrow
   */
  export type ParcelaVencimentoFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParcelaVencimento
     */
    select?: ParcelaVencimentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParcelaVencimento
     */
    omit?: ParcelaVencimentoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParcelaVencimentoInclude<ExtArgs> | null
    /**
     * Filter, which ParcelaVencimento to fetch.
     */
    where?: ParcelaVencimentoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ParcelaVencimentos to fetch.
     */
    orderBy?: ParcelaVencimentoOrderByWithRelationInput | ParcelaVencimentoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ParcelaVencimentos.
     */
    cursor?: ParcelaVencimentoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ParcelaVencimentos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ParcelaVencimentos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ParcelaVencimentos.
     */
    distinct?: ParcelaVencimentoScalarFieldEnum | ParcelaVencimentoScalarFieldEnum[]
  }

  /**
   * ParcelaVencimento findMany
   */
  export type ParcelaVencimentoFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParcelaVencimento
     */
    select?: ParcelaVencimentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParcelaVencimento
     */
    omit?: ParcelaVencimentoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParcelaVencimentoInclude<ExtArgs> | null
    /**
     * Filter, which ParcelaVencimentos to fetch.
     */
    where?: ParcelaVencimentoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ParcelaVencimentos to fetch.
     */
    orderBy?: ParcelaVencimentoOrderByWithRelationInput | ParcelaVencimentoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ParcelaVencimentos.
     */
    cursor?: ParcelaVencimentoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ParcelaVencimentos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ParcelaVencimentos.
     */
    skip?: number
    distinct?: ParcelaVencimentoScalarFieldEnum | ParcelaVencimentoScalarFieldEnum[]
  }

  /**
   * ParcelaVencimento create
   */
  export type ParcelaVencimentoCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParcelaVencimento
     */
    select?: ParcelaVencimentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParcelaVencimento
     */
    omit?: ParcelaVencimentoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParcelaVencimentoInclude<ExtArgs> | null
    /**
     * The data needed to create a ParcelaVencimento.
     */
    data: XOR<ParcelaVencimentoCreateInput, ParcelaVencimentoUncheckedCreateInput>
  }

  /**
   * ParcelaVencimento createMany
   */
  export type ParcelaVencimentoCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ParcelaVencimentos.
     */
    data: ParcelaVencimentoCreateManyInput | ParcelaVencimentoCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ParcelaVencimento createManyAndReturn
   */
  export type ParcelaVencimentoCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParcelaVencimento
     */
    select?: ParcelaVencimentoSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ParcelaVencimento
     */
    omit?: ParcelaVencimentoOmit<ExtArgs> | null
    /**
     * The data used to create many ParcelaVencimentos.
     */
    data: ParcelaVencimentoCreateManyInput | ParcelaVencimentoCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParcelaVencimentoIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ParcelaVencimento update
   */
  export type ParcelaVencimentoUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParcelaVencimento
     */
    select?: ParcelaVencimentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParcelaVencimento
     */
    omit?: ParcelaVencimentoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParcelaVencimentoInclude<ExtArgs> | null
    /**
     * The data needed to update a ParcelaVencimento.
     */
    data: XOR<ParcelaVencimentoUpdateInput, ParcelaVencimentoUncheckedUpdateInput>
    /**
     * Choose, which ParcelaVencimento to update.
     */
    where: ParcelaVencimentoWhereUniqueInput
  }

  /**
   * ParcelaVencimento updateMany
   */
  export type ParcelaVencimentoUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ParcelaVencimentos.
     */
    data: XOR<ParcelaVencimentoUpdateManyMutationInput, ParcelaVencimentoUncheckedUpdateManyInput>
    /**
     * Filter which ParcelaVencimentos to update
     */
    where?: ParcelaVencimentoWhereInput
    /**
     * Limit how many ParcelaVencimentos to update.
     */
    limit?: number
  }

  /**
   * ParcelaVencimento updateManyAndReturn
   */
  export type ParcelaVencimentoUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParcelaVencimento
     */
    select?: ParcelaVencimentoSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ParcelaVencimento
     */
    omit?: ParcelaVencimentoOmit<ExtArgs> | null
    /**
     * The data used to update ParcelaVencimentos.
     */
    data: XOR<ParcelaVencimentoUpdateManyMutationInput, ParcelaVencimentoUncheckedUpdateManyInput>
    /**
     * Filter which ParcelaVencimentos to update
     */
    where?: ParcelaVencimentoWhereInput
    /**
     * Limit how many ParcelaVencimentos to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParcelaVencimentoIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * ParcelaVencimento upsert
   */
  export type ParcelaVencimentoUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParcelaVencimento
     */
    select?: ParcelaVencimentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParcelaVencimento
     */
    omit?: ParcelaVencimentoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParcelaVencimentoInclude<ExtArgs> | null
    /**
     * The filter to search for the ParcelaVencimento to update in case it exists.
     */
    where: ParcelaVencimentoWhereUniqueInput
    /**
     * In case the ParcelaVencimento found by the `where` argument doesn't exist, create a new ParcelaVencimento with this data.
     */
    create: XOR<ParcelaVencimentoCreateInput, ParcelaVencimentoUncheckedCreateInput>
    /**
     * In case the ParcelaVencimento was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ParcelaVencimentoUpdateInput, ParcelaVencimentoUncheckedUpdateInput>
  }

  /**
   * ParcelaVencimento delete
   */
  export type ParcelaVencimentoDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParcelaVencimento
     */
    select?: ParcelaVencimentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParcelaVencimento
     */
    omit?: ParcelaVencimentoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParcelaVencimentoInclude<ExtArgs> | null
    /**
     * Filter which ParcelaVencimento to delete.
     */
    where: ParcelaVencimentoWhereUniqueInput
  }

  /**
   * ParcelaVencimento deleteMany
   */
  export type ParcelaVencimentoDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ParcelaVencimentos to delete
     */
    where?: ParcelaVencimentoWhereInput
    /**
     * Limit how many ParcelaVencimentos to delete.
     */
    limit?: number
  }

  /**
   * ParcelaVencimento without action
   */
  export type ParcelaVencimentoDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParcelaVencimento
     */
    select?: ParcelaVencimentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParcelaVencimento
     */
    omit?: ParcelaVencimentoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParcelaVencimentoInclude<ExtArgs> | null
  }


  /**
   * Model Config
   */

  export type AggregateConfig = {
    _count: ConfigCountAggregateOutputType | null
    _avg: ConfigAvgAggregateOutputType | null
    _sum: ConfigSumAggregateOutputType | null
    _min: ConfigMinAggregateOutputType | null
    _max: ConfigMaxAggregateOutputType | null
  }

  export type ConfigAvgAggregateOutputType = {
    id: number | null
    whatsappAutoEnabled: number | null
  }

  export type ConfigSumAggregateOutputType = {
    id: number | null
    whatsappAutoEnabled: number | null
  }

  export type ConfigMinAggregateOutputType = {
    id: number | null
    modeloContrato: string | null
    modeloReciboVenda: string | null
    logoPath: string | null
    openaiKey: string | null
    geminiKey: string | null
    evolutionApiUrl: string | null
    evolutionApiKey: string | null
    evolutionInstance: string | null
    whatsappAutoEnabled: number | null
  }

  export type ConfigMaxAggregateOutputType = {
    id: number | null
    modeloContrato: string | null
    modeloReciboVenda: string | null
    logoPath: string | null
    openaiKey: string | null
    geminiKey: string | null
    evolutionApiUrl: string | null
    evolutionApiKey: string | null
    evolutionInstance: string | null
    whatsappAutoEnabled: number | null
  }

  export type ConfigCountAggregateOutputType = {
    id: number
    modeloContrato: number
    modeloReciboVenda: number
    logoPath: number
    openaiKey: number
    geminiKey: number
    evolutionApiUrl: number
    evolutionApiKey: number
    evolutionInstance: number
    whatsappAutoEnabled: number
    _all: number
  }


  export type ConfigAvgAggregateInputType = {
    id?: true
    whatsappAutoEnabled?: true
  }

  export type ConfigSumAggregateInputType = {
    id?: true
    whatsappAutoEnabled?: true
  }

  export type ConfigMinAggregateInputType = {
    id?: true
    modeloContrato?: true
    modeloReciboVenda?: true
    logoPath?: true
    openaiKey?: true
    geminiKey?: true
    evolutionApiUrl?: true
    evolutionApiKey?: true
    evolutionInstance?: true
    whatsappAutoEnabled?: true
  }

  export type ConfigMaxAggregateInputType = {
    id?: true
    modeloContrato?: true
    modeloReciboVenda?: true
    logoPath?: true
    openaiKey?: true
    geminiKey?: true
    evolutionApiUrl?: true
    evolutionApiKey?: true
    evolutionInstance?: true
    whatsappAutoEnabled?: true
  }

  export type ConfigCountAggregateInputType = {
    id?: true
    modeloContrato?: true
    modeloReciboVenda?: true
    logoPath?: true
    openaiKey?: true
    geminiKey?: true
    evolutionApiUrl?: true
    evolutionApiKey?: true
    evolutionInstance?: true
    whatsappAutoEnabled?: true
    _all?: true
  }

  export type ConfigAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Config to aggregate.
     */
    where?: ConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Configs to fetch.
     */
    orderBy?: ConfigOrderByWithRelationInput | ConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Configs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Configs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Configs
    **/
    _count?: true | ConfigCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ConfigAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ConfigSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ConfigMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ConfigMaxAggregateInputType
  }

  export type GetConfigAggregateType<T extends ConfigAggregateArgs> = {
        [P in keyof T & keyof AggregateConfig]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateConfig[P]>
      : GetScalarType<T[P], AggregateConfig[P]>
  }




  export type ConfigGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ConfigWhereInput
    orderBy?: ConfigOrderByWithAggregationInput | ConfigOrderByWithAggregationInput[]
    by: ConfigScalarFieldEnum[] | ConfigScalarFieldEnum
    having?: ConfigScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ConfigCountAggregateInputType | true
    _avg?: ConfigAvgAggregateInputType
    _sum?: ConfigSumAggregateInputType
    _min?: ConfigMinAggregateInputType
    _max?: ConfigMaxAggregateInputType
  }

  export type ConfigGroupByOutputType = {
    id: number
    modeloContrato: string | null
    modeloReciboVenda: string | null
    logoPath: string | null
    openaiKey: string | null
    geminiKey: string | null
    evolutionApiUrl: string | null
    evolutionApiKey: string | null
    evolutionInstance: string | null
    whatsappAutoEnabled: number | null
    _count: ConfigCountAggregateOutputType | null
    _avg: ConfigAvgAggregateOutputType | null
    _sum: ConfigSumAggregateOutputType | null
    _min: ConfigMinAggregateOutputType | null
    _max: ConfigMaxAggregateOutputType | null
  }

  type GetConfigGroupByPayload<T extends ConfigGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ConfigGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ConfigGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ConfigGroupByOutputType[P]>
            : GetScalarType<T[P], ConfigGroupByOutputType[P]>
        }
      >
    >


  export type ConfigSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    modeloContrato?: boolean
    modeloReciboVenda?: boolean
    logoPath?: boolean
    openaiKey?: boolean
    geminiKey?: boolean
    evolutionApiUrl?: boolean
    evolutionApiKey?: boolean
    evolutionInstance?: boolean
    whatsappAutoEnabled?: boolean
  }, ExtArgs["result"]["config"]>

  export type ConfigSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    modeloContrato?: boolean
    modeloReciboVenda?: boolean
    logoPath?: boolean
    openaiKey?: boolean
    geminiKey?: boolean
    evolutionApiUrl?: boolean
    evolutionApiKey?: boolean
    evolutionInstance?: boolean
    whatsappAutoEnabled?: boolean
  }, ExtArgs["result"]["config"]>

  export type ConfigSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    modeloContrato?: boolean
    modeloReciboVenda?: boolean
    logoPath?: boolean
    openaiKey?: boolean
    geminiKey?: boolean
    evolutionApiUrl?: boolean
    evolutionApiKey?: boolean
    evolutionInstance?: boolean
    whatsappAutoEnabled?: boolean
  }, ExtArgs["result"]["config"]>

  export type ConfigSelectScalar = {
    id?: boolean
    modeloContrato?: boolean
    modeloReciboVenda?: boolean
    logoPath?: boolean
    openaiKey?: boolean
    geminiKey?: boolean
    evolutionApiUrl?: boolean
    evolutionApiKey?: boolean
    evolutionInstance?: boolean
    whatsappAutoEnabled?: boolean
  }

  export type ConfigOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "modeloContrato" | "modeloReciboVenda" | "logoPath" | "openaiKey" | "geminiKey" | "evolutionApiUrl" | "evolutionApiKey" | "evolutionInstance" | "whatsappAutoEnabled", ExtArgs["result"]["config"]>

  export type $ConfigPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Config"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      modeloContrato: string | null
      modeloReciboVenda: string | null
      logoPath: string | null
      openaiKey: string | null
      geminiKey: string | null
      evolutionApiUrl: string | null
      evolutionApiKey: string | null
      evolutionInstance: string | null
      whatsappAutoEnabled: number | null
    }, ExtArgs["result"]["config"]>
    composites: {}
  }

  type ConfigGetPayload<S extends boolean | null | undefined | ConfigDefaultArgs> = $Result.GetResult<Prisma.$ConfigPayload, S>

  type ConfigCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ConfigFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ConfigCountAggregateInputType | true
    }

  export interface ConfigDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Config'], meta: { name: 'Config' } }
    /**
     * Find zero or one Config that matches the filter.
     * @param {ConfigFindUniqueArgs} args - Arguments to find a Config
     * @example
     * // Get one Config
     * const config = await prisma.config.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ConfigFindUniqueArgs>(args: SelectSubset<T, ConfigFindUniqueArgs<ExtArgs>>): Prisma__ConfigClient<$Result.GetResult<Prisma.$ConfigPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Config that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ConfigFindUniqueOrThrowArgs} args - Arguments to find a Config
     * @example
     * // Get one Config
     * const config = await prisma.config.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ConfigFindUniqueOrThrowArgs>(args: SelectSubset<T, ConfigFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ConfigClient<$Result.GetResult<Prisma.$ConfigPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Config that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConfigFindFirstArgs} args - Arguments to find a Config
     * @example
     * // Get one Config
     * const config = await prisma.config.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ConfigFindFirstArgs>(args?: SelectSubset<T, ConfigFindFirstArgs<ExtArgs>>): Prisma__ConfigClient<$Result.GetResult<Prisma.$ConfigPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Config that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConfigFindFirstOrThrowArgs} args - Arguments to find a Config
     * @example
     * // Get one Config
     * const config = await prisma.config.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ConfigFindFirstOrThrowArgs>(args?: SelectSubset<T, ConfigFindFirstOrThrowArgs<ExtArgs>>): Prisma__ConfigClient<$Result.GetResult<Prisma.$ConfigPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Configs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConfigFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Configs
     * const configs = await prisma.config.findMany()
     * 
     * // Get first 10 Configs
     * const configs = await prisma.config.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const configWithIdOnly = await prisma.config.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ConfigFindManyArgs>(args?: SelectSubset<T, ConfigFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConfigPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Config.
     * @param {ConfigCreateArgs} args - Arguments to create a Config.
     * @example
     * // Create one Config
     * const Config = await prisma.config.create({
     *   data: {
     *     // ... data to create a Config
     *   }
     * })
     * 
     */
    create<T extends ConfigCreateArgs>(args: SelectSubset<T, ConfigCreateArgs<ExtArgs>>): Prisma__ConfigClient<$Result.GetResult<Prisma.$ConfigPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Configs.
     * @param {ConfigCreateManyArgs} args - Arguments to create many Configs.
     * @example
     * // Create many Configs
     * const config = await prisma.config.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ConfigCreateManyArgs>(args?: SelectSubset<T, ConfigCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Configs and returns the data saved in the database.
     * @param {ConfigCreateManyAndReturnArgs} args - Arguments to create many Configs.
     * @example
     * // Create many Configs
     * const config = await prisma.config.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Configs and only return the `id`
     * const configWithIdOnly = await prisma.config.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ConfigCreateManyAndReturnArgs>(args?: SelectSubset<T, ConfigCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConfigPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Config.
     * @param {ConfigDeleteArgs} args - Arguments to delete one Config.
     * @example
     * // Delete one Config
     * const Config = await prisma.config.delete({
     *   where: {
     *     // ... filter to delete one Config
     *   }
     * })
     * 
     */
    delete<T extends ConfigDeleteArgs>(args: SelectSubset<T, ConfigDeleteArgs<ExtArgs>>): Prisma__ConfigClient<$Result.GetResult<Prisma.$ConfigPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Config.
     * @param {ConfigUpdateArgs} args - Arguments to update one Config.
     * @example
     * // Update one Config
     * const config = await prisma.config.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ConfigUpdateArgs>(args: SelectSubset<T, ConfigUpdateArgs<ExtArgs>>): Prisma__ConfigClient<$Result.GetResult<Prisma.$ConfigPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Configs.
     * @param {ConfigDeleteManyArgs} args - Arguments to filter Configs to delete.
     * @example
     * // Delete a few Configs
     * const { count } = await prisma.config.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ConfigDeleteManyArgs>(args?: SelectSubset<T, ConfigDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Configs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConfigUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Configs
     * const config = await prisma.config.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ConfigUpdateManyArgs>(args: SelectSubset<T, ConfigUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Configs and returns the data updated in the database.
     * @param {ConfigUpdateManyAndReturnArgs} args - Arguments to update many Configs.
     * @example
     * // Update many Configs
     * const config = await prisma.config.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Configs and only return the `id`
     * const configWithIdOnly = await prisma.config.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ConfigUpdateManyAndReturnArgs>(args: SelectSubset<T, ConfigUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConfigPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Config.
     * @param {ConfigUpsertArgs} args - Arguments to update or create a Config.
     * @example
     * // Update or create a Config
     * const config = await prisma.config.upsert({
     *   create: {
     *     // ... data to create a Config
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Config we want to update
     *   }
     * })
     */
    upsert<T extends ConfigUpsertArgs>(args: SelectSubset<T, ConfigUpsertArgs<ExtArgs>>): Prisma__ConfigClient<$Result.GetResult<Prisma.$ConfigPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Configs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConfigCountArgs} args - Arguments to filter Configs to count.
     * @example
     * // Count the number of Configs
     * const count = await prisma.config.count({
     *   where: {
     *     // ... the filter for the Configs we want to count
     *   }
     * })
    **/
    count<T extends ConfigCountArgs>(
      args?: Subset<T, ConfigCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ConfigCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Config.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConfigAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ConfigAggregateArgs>(args: Subset<T, ConfigAggregateArgs>): Prisma.PrismaPromise<GetConfigAggregateType<T>>

    /**
     * Group by Config.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConfigGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ConfigGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ConfigGroupByArgs['orderBy'] }
        : { orderBy?: ConfigGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ConfigGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetConfigGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Config model
   */
  readonly fields: ConfigFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Config.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ConfigClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Config model
   */
  interface ConfigFieldRefs {
    readonly id: FieldRef<"Config", 'Int'>
    readonly modeloContrato: FieldRef<"Config", 'String'>
    readonly modeloReciboVenda: FieldRef<"Config", 'String'>
    readonly logoPath: FieldRef<"Config", 'String'>
    readonly openaiKey: FieldRef<"Config", 'String'>
    readonly geminiKey: FieldRef<"Config", 'String'>
    readonly evolutionApiUrl: FieldRef<"Config", 'String'>
    readonly evolutionApiKey: FieldRef<"Config", 'String'>
    readonly evolutionInstance: FieldRef<"Config", 'String'>
    readonly whatsappAutoEnabled: FieldRef<"Config", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * Config findUnique
   */
  export type ConfigFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Config
     */
    select?: ConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Config
     */
    omit?: ConfigOmit<ExtArgs> | null
    /**
     * Filter, which Config to fetch.
     */
    where: ConfigWhereUniqueInput
  }

  /**
   * Config findUniqueOrThrow
   */
  export type ConfigFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Config
     */
    select?: ConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Config
     */
    omit?: ConfigOmit<ExtArgs> | null
    /**
     * Filter, which Config to fetch.
     */
    where: ConfigWhereUniqueInput
  }

  /**
   * Config findFirst
   */
  export type ConfigFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Config
     */
    select?: ConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Config
     */
    omit?: ConfigOmit<ExtArgs> | null
    /**
     * Filter, which Config to fetch.
     */
    where?: ConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Configs to fetch.
     */
    orderBy?: ConfigOrderByWithRelationInput | ConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Configs.
     */
    cursor?: ConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Configs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Configs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Configs.
     */
    distinct?: ConfigScalarFieldEnum | ConfigScalarFieldEnum[]
  }

  /**
   * Config findFirstOrThrow
   */
  export type ConfigFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Config
     */
    select?: ConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Config
     */
    omit?: ConfigOmit<ExtArgs> | null
    /**
     * Filter, which Config to fetch.
     */
    where?: ConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Configs to fetch.
     */
    orderBy?: ConfigOrderByWithRelationInput | ConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Configs.
     */
    cursor?: ConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Configs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Configs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Configs.
     */
    distinct?: ConfigScalarFieldEnum | ConfigScalarFieldEnum[]
  }

  /**
   * Config findMany
   */
  export type ConfigFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Config
     */
    select?: ConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Config
     */
    omit?: ConfigOmit<ExtArgs> | null
    /**
     * Filter, which Configs to fetch.
     */
    where?: ConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Configs to fetch.
     */
    orderBy?: ConfigOrderByWithRelationInput | ConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Configs.
     */
    cursor?: ConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Configs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Configs.
     */
    skip?: number
    distinct?: ConfigScalarFieldEnum | ConfigScalarFieldEnum[]
  }

  /**
   * Config create
   */
  export type ConfigCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Config
     */
    select?: ConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Config
     */
    omit?: ConfigOmit<ExtArgs> | null
    /**
     * The data needed to create a Config.
     */
    data?: XOR<ConfigCreateInput, ConfigUncheckedCreateInput>
  }

  /**
   * Config createMany
   */
  export type ConfigCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Configs.
     */
    data: ConfigCreateManyInput | ConfigCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Config createManyAndReturn
   */
  export type ConfigCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Config
     */
    select?: ConfigSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Config
     */
    omit?: ConfigOmit<ExtArgs> | null
    /**
     * The data used to create many Configs.
     */
    data: ConfigCreateManyInput | ConfigCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Config update
   */
  export type ConfigUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Config
     */
    select?: ConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Config
     */
    omit?: ConfigOmit<ExtArgs> | null
    /**
     * The data needed to update a Config.
     */
    data: XOR<ConfigUpdateInput, ConfigUncheckedUpdateInput>
    /**
     * Choose, which Config to update.
     */
    where: ConfigWhereUniqueInput
  }

  /**
   * Config updateMany
   */
  export type ConfigUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Configs.
     */
    data: XOR<ConfigUpdateManyMutationInput, ConfigUncheckedUpdateManyInput>
    /**
     * Filter which Configs to update
     */
    where?: ConfigWhereInput
    /**
     * Limit how many Configs to update.
     */
    limit?: number
  }

  /**
   * Config updateManyAndReturn
   */
  export type ConfigUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Config
     */
    select?: ConfigSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Config
     */
    omit?: ConfigOmit<ExtArgs> | null
    /**
     * The data used to update Configs.
     */
    data: XOR<ConfigUpdateManyMutationInput, ConfigUncheckedUpdateManyInput>
    /**
     * Filter which Configs to update
     */
    where?: ConfigWhereInput
    /**
     * Limit how many Configs to update.
     */
    limit?: number
  }

  /**
   * Config upsert
   */
  export type ConfigUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Config
     */
    select?: ConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Config
     */
    omit?: ConfigOmit<ExtArgs> | null
    /**
     * The filter to search for the Config to update in case it exists.
     */
    where: ConfigWhereUniqueInput
    /**
     * In case the Config found by the `where` argument doesn't exist, create a new Config with this data.
     */
    create: XOR<ConfigCreateInput, ConfigUncheckedCreateInput>
    /**
     * In case the Config was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ConfigUpdateInput, ConfigUncheckedUpdateInput>
  }

  /**
   * Config delete
   */
  export type ConfigDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Config
     */
    select?: ConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Config
     */
    omit?: ConfigOmit<ExtArgs> | null
    /**
     * Filter which Config to delete.
     */
    where: ConfigWhereUniqueInput
  }

  /**
   * Config deleteMany
   */
  export type ConfigDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Configs to delete
     */
    where?: ConfigWhereInput
    /**
     * Limit how many Configs to delete.
     */
    limit?: number
  }

  /**
   * Config without action
   */
  export type ConfigDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Config
     */
    select?: ConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Config
     */
    omit?: ConfigOmit<ExtArgs> | null
  }


  /**
   * Model Usuario
   */

  export type AggregateUsuario = {
    _count: UsuarioCountAggregateOutputType | null
    _avg: UsuarioAvgAggregateOutputType | null
    _sum: UsuarioSumAggregateOutputType | null
    _min: UsuarioMinAggregateOutputType | null
    _max: UsuarioMaxAggregateOutputType | null
  }

  export type UsuarioAvgAggregateOutputType = {
    id: number | null
    metaMensal: number | null
    comissaoPct: number | null
  }

  export type UsuarioSumAggregateOutputType = {
    id: number | null
    metaMensal: number | null
    comissaoPct: number | null
  }

  export type UsuarioMinAggregateOutputType = {
    id: number | null
    username: string | null
    password: string | null
    role: string | null
    nomeExibicao: string | null
    email: string | null
    telefone: string | null
    dataNascimento: Date | null
    endereco: string | null
    cep: string | null
    metaMensal: number | null
    comissaoPct: number | null
  }

  export type UsuarioMaxAggregateOutputType = {
    id: number | null
    username: string | null
    password: string | null
    role: string | null
    nomeExibicao: string | null
    email: string | null
    telefone: string | null
    dataNascimento: Date | null
    endereco: string | null
    cep: string | null
    metaMensal: number | null
    comissaoPct: number | null
  }

  export type UsuarioCountAggregateOutputType = {
    id: number
    username: number
    password: number
    role: number
    nomeExibicao: number
    email: number
    telefone: number
    dataNascimento: number
    endereco: number
    cep: number
    metaMensal: number
    comissaoPct: number
    _all: number
  }


  export type UsuarioAvgAggregateInputType = {
    id?: true
    metaMensal?: true
    comissaoPct?: true
  }

  export type UsuarioSumAggregateInputType = {
    id?: true
    metaMensal?: true
    comissaoPct?: true
  }

  export type UsuarioMinAggregateInputType = {
    id?: true
    username?: true
    password?: true
    role?: true
    nomeExibicao?: true
    email?: true
    telefone?: true
    dataNascimento?: true
    endereco?: true
    cep?: true
    metaMensal?: true
    comissaoPct?: true
  }

  export type UsuarioMaxAggregateInputType = {
    id?: true
    username?: true
    password?: true
    role?: true
    nomeExibicao?: true
    email?: true
    telefone?: true
    dataNascimento?: true
    endereco?: true
    cep?: true
    metaMensal?: true
    comissaoPct?: true
  }

  export type UsuarioCountAggregateInputType = {
    id?: true
    username?: true
    password?: true
    role?: true
    nomeExibicao?: true
    email?: true
    telefone?: true
    dataNascimento?: true
    endereco?: true
    cep?: true
    metaMensal?: true
    comissaoPct?: true
    _all?: true
  }

  export type UsuarioAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Usuario to aggregate.
     */
    where?: UsuarioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Usuarios to fetch.
     */
    orderBy?: UsuarioOrderByWithRelationInput | UsuarioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UsuarioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Usuarios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Usuarios.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Usuarios
    **/
    _count?: true | UsuarioCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: UsuarioAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: UsuarioSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UsuarioMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UsuarioMaxAggregateInputType
  }

  export type GetUsuarioAggregateType<T extends UsuarioAggregateArgs> = {
        [P in keyof T & keyof AggregateUsuario]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUsuario[P]>
      : GetScalarType<T[P], AggregateUsuario[P]>
  }




  export type UsuarioGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UsuarioWhereInput
    orderBy?: UsuarioOrderByWithAggregationInput | UsuarioOrderByWithAggregationInput[]
    by: UsuarioScalarFieldEnum[] | UsuarioScalarFieldEnum
    having?: UsuarioScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UsuarioCountAggregateInputType | true
    _avg?: UsuarioAvgAggregateInputType
    _sum?: UsuarioSumAggregateInputType
    _min?: UsuarioMinAggregateInputType
    _max?: UsuarioMaxAggregateInputType
  }

  export type UsuarioGroupByOutputType = {
    id: number
    username: string
    password: string
    role: string | null
    nomeExibicao: string | null
    email: string | null
    telefone: string | null
    dataNascimento: Date | null
    endereco: string | null
    cep: string | null
    metaMensal: number | null
    comissaoPct: number | null
    _count: UsuarioCountAggregateOutputType | null
    _avg: UsuarioAvgAggregateOutputType | null
    _sum: UsuarioSumAggregateOutputType | null
    _min: UsuarioMinAggregateOutputType | null
    _max: UsuarioMaxAggregateOutputType | null
  }

  type GetUsuarioGroupByPayload<T extends UsuarioGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UsuarioGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UsuarioGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UsuarioGroupByOutputType[P]>
            : GetScalarType<T[P], UsuarioGroupByOutputType[P]>
        }
      >
    >


  export type UsuarioSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    username?: boolean
    password?: boolean
    role?: boolean
    nomeExibicao?: boolean
    email?: boolean
    telefone?: boolean
    dataNascimento?: boolean
    endereco?: boolean
    cep?: boolean
    metaMensal?: boolean
    comissaoPct?: boolean
  }, ExtArgs["result"]["usuario"]>

  export type UsuarioSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    username?: boolean
    password?: boolean
    role?: boolean
    nomeExibicao?: boolean
    email?: boolean
    telefone?: boolean
    dataNascimento?: boolean
    endereco?: boolean
    cep?: boolean
    metaMensal?: boolean
    comissaoPct?: boolean
  }, ExtArgs["result"]["usuario"]>

  export type UsuarioSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    username?: boolean
    password?: boolean
    role?: boolean
    nomeExibicao?: boolean
    email?: boolean
    telefone?: boolean
    dataNascimento?: boolean
    endereco?: boolean
    cep?: boolean
    metaMensal?: boolean
    comissaoPct?: boolean
  }, ExtArgs["result"]["usuario"]>

  export type UsuarioSelectScalar = {
    id?: boolean
    username?: boolean
    password?: boolean
    role?: boolean
    nomeExibicao?: boolean
    email?: boolean
    telefone?: boolean
    dataNascimento?: boolean
    endereco?: boolean
    cep?: boolean
    metaMensal?: boolean
    comissaoPct?: boolean
  }

  export type UsuarioOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "username" | "password" | "role" | "nomeExibicao" | "email" | "telefone" | "dataNascimento" | "endereco" | "cep" | "metaMensal" | "comissaoPct", ExtArgs["result"]["usuario"]>

  export type $UsuarioPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Usuario"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      username: string
      password: string
      role: string | null
      nomeExibicao: string | null
      email: string | null
      telefone: string | null
      dataNascimento: Date | null
      endereco: string | null
      cep: string | null
      metaMensal: number | null
      comissaoPct: number | null
    }, ExtArgs["result"]["usuario"]>
    composites: {}
  }

  type UsuarioGetPayload<S extends boolean | null | undefined | UsuarioDefaultArgs> = $Result.GetResult<Prisma.$UsuarioPayload, S>

  type UsuarioCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UsuarioFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UsuarioCountAggregateInputType | true
    }

  export interface UsuarioDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Usuario'], meta: { name: 'Usuario' } }
    /**
     * Find zero or one Usuario that matches the filter.
     * @param {UsuarioFindUniqueArgs} args - Arguments to find a Usuario
     * @example
     * // Get one Usuario
     * const usuario = await prisma.usuario.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UsuarioFindUniqueArgs>(args: SelectSubset<T, UsuarioFindUniqueArgs<ExtArgs>>): Prisma__UsuarioClient<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Usuario that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UsuarioFindUniqueOrThrowArgs} args - Arguments to find a Usuario
     * @example
     * // Get one Usuario
     * const usuario = await prisma.usuario.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UsuarioFindUniqueOrThrowArgs>(args: SelectSubset<T, UsuarioFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UsuarioClient<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Usuario that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsuarioFindFirstArgs} args - Arguments to find a Usuario
     * @example
     * // Get one Usuario
     * const usuario = await prisma.usuario.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UsuarioFindFirstArgs>(args?: SelectSubset<T, UsuarioFindFirstArgs<ExtArgs>>): Prisma__UsuarioClient<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Usuario that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsuarioFindFirstOrThrowArgs} args - Arguments to find a Usuario
     * @example
     * // Get one Usuario
     * const usuario = await prisma.usuario.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UsuarioFindFirstOrThrowArgs>(args?: SelectSubset<T, UsuarioFindFirstOrThrowArgs<ExtArgs>>): Prisma__UsuarioClient<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Usuarios that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsuarioFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Usuarios
     * const usuarios = await prisma.usuario.findMany()
     * 
     * // Get first 10 Usuarios
     * const usuarios = await prisma.usuario.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const usuarioWithIdOnly = await prisma.usuario.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UsuarioFindManyArgs>(args?: SelectSubset<T, UsuarioFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Usuario.
     * @param {UsuarioCreateArgs} args - Arguments to create a Usuario.
     * @example
     * // Create one Usuario
     * const Usuario = await prisma.usuario.create({
     *   data: {
     *     // ... data to create a Usuario
     *   }
     * })
     * 
     */
    create<T extends UsuarioCreateArgs>(args: SelectSubset<T, UsuarioCreateArgs<ExtArgs>>): Prisma__UsuarioClient<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Usuarios.
     * @param {UsuarioCreateManyArgs} args - Arguments to create many Usuarios.
     * @example
     * // Create many Usuarios
     * const usuario = await prisma.usuario.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UsuarioCreateManyArgs>(args?: SelectSubset<T, UsuarioCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Usuarios and returns the data saved in the database.
     * @param {UsuarioCreateManyAndReturnArgs} args - Arguments to create many Usuarios.
     * @example
     * // Create many Usuarios
     * const usuario = await prisma.usuario.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Usuarios and only return the `id`
     * const usuarioWithIdOnly = await prisma.usuario.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UsuarioCreateManyAndReturnArgs>(args?: SelectSubset<T, UsuarioCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Usuario.
     * @param {UsuarioDeleteArgs} args - Arguments to delete one Usuario.
     * @example
     * // Delete one Usuario
     * const Usuario = await prisma.usuario.delete({
     *   where: {
     *     // ... filter to delete one Usuario
     *   }
     * })
     * 
     */
    delete<T extends UsuarioDeleteArgs>(args: SelectSubset<T, UsuarioDeleteArgs<ExtArgs>>): Prisma__UsuarioClient<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Usuario.
     * @param {UsuarioUpdateArgs} args - Arguments to update one Usuario.
     * @example
     * // Update one Usuario
     * const usuario = await prisma.usuario.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UsuarioUpdateArgs>(args: SelectSubset<T, UsuarioUpdateArgs<ExtArgs>>): Prisma__UsuarioClient<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Usuarios.
     * @param {UsuarioDeleteManyArgs} args - Arguments to filter Usuarios to delete.
     * @example
     * // Delete a few Usuarios
     * const { count } = await prisma.usuario.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UsuarioDeleteManyArgs>(args?: SelectSubset<T, UsuarioDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Usuarios.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsuarioUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Usuarios
     * const usuario = await prisma.usuario.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UsuarioUpdateManyArgs>(args: SelectSubset<T, UsuarioUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Usuarios and returns the data updated in the database.
     * @param {UsuarioUpdateManyAndReturnArgs} args - Arguments to update many Usuarios.
     * @example
     * // Update many Usuarios
     * const usuario = await prisma.usuario.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Usuarios and only return the `id`
     * const usuarioWithIdOnly = await prisma.usuario.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UsuarioUpdateManyAndReturnArgs>(args: SelectSubset<T, UsuarioUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Usuario.
     * @param {UsuarioUpsertArgs} args - Arguments to update or create a Usuario.
     * @example
     * // Update or create a Usuario
     * const usuario = await prisma.usuario.upsert({
     *   create: {
     *     // ... data to create a Usuario
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Usuario we want to update
     *   }
     * })
     */
    upsert<T extends UsuarioUpsertArgs>(args: SelectSubset<T, UsuarioUpsertArgs<ExtArgs>>): Prisma__UsuarioClient<$Result.GetResult<Prisma.$UsuarioPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Usuarios.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsuarioCountArgs} args - Arguments to filter Usuarios to count.
     * @example
     * // Count the number of Usuarios
     * const count = await prisma.usuario.count({
     *   where: {
     *     // ... the filter for the Usuarios we want to count
     *   }
     * })
    **/
    count<T extends UsuarioCountArgs>(
      args?: Subset<T, UsuarioCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UsuarioCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Usuario.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsuarioAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UsuarioAggregateArgs>(args: Subset<T, UsuarioAggregateArgs>): Prisma.PrismaPromise<GetUsuarioAggregateType<T>>

    /**
     * Group by Usuario.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsuarioGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UsuarioGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UsuarioGroupByArgs['orderBy'] }
        : { orderBy?: UsuarioGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UsuarioGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUsuarioGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Usuario model
   */
  readonly fields: UsuarioFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Usuario.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UsuarioClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Usuario model
   */
  interface UsuarioFieldRefs {
    readonly id: FieldRef<"Usuario", 'Int'>
    readonly username: FieldRef<"Usuario", 'String'>
    readonly password: FieldRef<"Usuario", 'String'>
    readonly role: FieldRef<"Usuario", 'String'>
    readonly nomeExibicao: FieldRef<"Usuario", 'String'>
    readonly email: FieldRef<"Usuario", 'String'>
    readonly telefone: FieldRef<"Usuario", 'String'>
    readonly dataNascimento: FieldRef<"Usuario", 'DateTime'>
    readonly endereco: FieldRef<"Usuario", 'String'>
    readonly cep: FieldRef<"Usuario", 'String'>
    readonly metaMensal: FieldRef<"Usuario", 'Float'>
    readonly comissaoPct: FieldRef<"Usuario", 'Float'>
  }
    

  // Custom InputTypes
  /**
   * Usuario findUnique
   */
  export type UsuarioFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Usuario
     */
    omit?: UsuarioOmit<ExtArgs> | null
    /**
     * Filter, which Usuario to fetch.
     */
    where: UsuarioWhereUniqueInput
  }

  /**
   * Usuario findUniqueOrThrow
   */
  export type UsuarioFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Usuario
     */
    omit?: UsuarioOmit<ExtArgs> | null
    /**
     * Filter, which Usuario to fetch.
     */
    where: UsuarioWhereUniqueInput
  }

  /**
   * Usuario findFirst
   */
  export type UsuarioFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Usuario
     */
    omit?: UsuarioOmit<ExtArgs> | null
    /**
     * Filter, which Usuario to fetch.
     */
    where?: UsuarioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Usuarios to fetch.
     */
    orderBy?: UsuarioOrderByWithRelationInput | UsuarioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Usuarios.
     */
    cursor?: UsuarioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Usuarios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Usuarios.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Usuarios.
     */
    distinct?: UsuarioScalarFieldEnum | UsuarioScalarFieldEnum[]
  }

  /**
   * Usuario findFirstOrThrow
   */
  export type UsuarioFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Usuario
     */
    omit?: UsuarioOmit<ExtArgs> | null
    /**
     * Filter, which Usuario to fetch.
     */
    where?: UsuarioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Usuarios to fetch.
     */
    orderBy?: UsuarioOrderByWithRelationInput | UsuarioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Usuarios.
     */
    cursor?: UsuarioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Usuarios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Usuarios.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Usuarios.
     */
    distinct?: UsuarioScalarFieldEnum | UsuarioScalarFieldEnum[]
  }

  /**
   * Usuario findMany
   */
  export type UsuarioFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Usuario
     */
    omit?: UsuarioOmit<ExtArgs> | null
    /**
     * Filter, which Usuarios to fetch.
     */
    where?: UsuarioWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Usuarios to fetch.
     */
    orderBy?: UsuarioOrderByWithRelationInput | UsuarioOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Usuarios.
     */
    cursor?: UsuarioWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Usuarios from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Usuarios.
     */
    skip?: number
    distinct?: UsuarioScalarFieldEnum | UsuarioScalarFieldEnum[]
  }

  /**
   * Usuario create
   */
  export type UsuarioCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Usuario
     */
    omit?: UsuarioOmit<ExtArgs> | null
    /**
     * The data needed to create a Usuario.
     */
    data: XOR<UsuarioCreateInput, UsuarioUncheckedCreateInput>
  }

  /**
   * Usuario createMany
   */
  export type UsuarioCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Usuarios.
     */
    data: UsuarioCreateManyInput | UsuarioCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Usuario createManyAndReturn
   */
  export type UsuarioCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Usuario
     */
    omit?: UsuarioOmit<ExtArgs> | null
    /**
     * The data used to create many Usuarios.
     */
    data: UsuarioCreateManyInput | UsuarioCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Usuario update
   */
  export type UsuarioUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Usuario
     */
    omit?: UsuarioOmit<ExtArgs> | null
    /**
     * The data needed to update a Usuario.
     */
    data: XOR<UsuarioUpdateInput, UsuarioUncheckedUpdateInput>
    /**
     * Choose, which Usuario to update.
     */
    where: UsuarioWhereUniqueInput
  }

  /**
   * Usuario updateMany
   */
  export type UsuarioUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Usuarios.
     */
    data: XOR<UsuarioUpdateManyMutationInput, UsuarioUncheckedUpdateManyInput>
    /**
     * Filter which Usuarios to update
     */
    where?: UsuarioWhereInput
    /**
     * Limit how many Usuarios to update.
     */
    limit?: number
  }

  /**
   * Usuario updateManyAndReturn
   */
  export type UsuarioUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Usuario
     */
    omit?: UsuarioOmit<ExtArgs> | null
    /**
     * The data used to update Usuarios.
     */
    data: XOR<UsuarioUpdateManyMutationInput, UsuarioUncheckedUpdateManyInput>
    /**
     * Filter which Usuarios to update
     */
    where?: UsuarioWhereInput
    /**
     * Limit how many Usuarios to update.
     */
    limit?: number
  }

  /**
   * Usuario upsert
   */
  export type UsuarioUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Usuario
     */
    omit?: UsuarioOmit<ExtArgs> | null
    /**
     * The filter to search for the Usuario to update in case it exists.
     */
    where: UsuarioWhereUniqueInput
    /**
     * In case the Usuario found by the `where` argument doesn't exist, create a new Usuario with this data.
     */
    create: XOR<UsuarioCreateInput, UsuarioUncheckedCreateInput>
    /**
     * In case the Usuario was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UsuarioUpdateInput, UsuarioUncheckedUpdateInput>
  }

  /**
   * Usuario delete
   */
  export type UsuarioDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Usuario
     */
    omit?: UsuarioOmit<ExtArgs> | null
    /**
     * Filter which Usuario to delete.
     */
    where: UsuarioWhereUniqueInput
  }

  /**
   * Usuario deleteMany
   */
  export type UsuarioDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Usuarios to delete
     */
    where?: UsuarioWhereInput
    /**
     * Limit how many Usuarios to delete.
     */
    limit?: number
  }

  /**
   * Usuario without action
   */
  export type UsuarioDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Usuario
     */
    select?: UsuarioSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Usuario
     */
    omit?: UsuarioOmit<ExtArgs> | null
  }


  /**
   * Model Fornecedor
   */

  export type AggregateFornecedor = {
    _count: FornecedorCountAggregateOutputType | null
    _avg: FornecedorAvgAggregateOutputType | null
    _sum: FornecedorSumAggregateOutputType | null
    _min: FornecedorMinAggregateOutputType | null
    _max: FornecedorMaxAggregateOutputType | null
  }

  export type FornecedorAvgAggregateOutputType = {
    id: number | null
  }

  export type FornecedorSumAggregateOutputType = {
    id: number | null
  }

  export type FornecedorMinAggregateOutputType = {
    id: number | null
    nome: string | null
    telefone: string | null
  }

  export type FornecedorMaxAggregateOutputType = {
    id: number | null
    nome: string | null
    telefone: string | null
  }

  export type FornecedorCountAggregateOutputType = {
    id: number
    nome: number
    telefone: number
    _all: number
  }


  export type FornecedorAvgAggregateInputType = {
    id?: true
  }

  export type FornecedorSumAggregateInputType = {
    id?: true
  }

  export type FornecedorMinAggregateInputType = {
    id?: true
    nome?: true
    telefone?: true
  }

  export type FornecedorMaxAggregateInputType = {
    id?: true
    nome?: true
    telefone?: true
  }

  export type FornecedorCountAggregateInputType = {
    id?: true
    nome?: true
    telefone?: true
    _all?: true
  }

  export type FornecedorAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Fornecedor to aggregate.
     */
    where?: FornecedorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Fornecedors to fetch.
     */
    orderBy?: FornecedorOrderByWithRelationInput | FornecedorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: FornecedorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Fornecedors from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Fornecedors.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Fornecedors
    **/
    _count?: true | FornecedorCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: FornecedorAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: FornecedorSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: FornecedorMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: FornecedorMaxAggregateInputType
  }

  export type GetFornecedorAggregateType<T extends FornecedorAggregateArgs> = {
        [P in keyof T & keyof AggregateFornecedor]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateFornecedor[P]>
      : GetScalarType<T[P], AggregateFornecedor[P]>
  }




  export type FornecedorGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FornecedorWhereInput
    orderBy?: FornecedorOrderByWithAggregationInput | FornecedorOrderByWithAggregationInput[]
    by: FornecedorScalarFieldEnum[] | FornecedorScalarFieldEnum
    having?: FornecedorScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: FornecedorCountAggregateInputType | true
    _avg?: FornecedorAvgAggregateInputType
    _sum?: FornecedorSumAggregateInputType
    _min?: FornecedorMinAggregateInputType
    _max?: FornecedorMaxAggregateInputType
  }

  export type FornecedorGroupByOutputType = {
    id: number
    nome: string
    telefone: string | null
    _count: FornecedorCountAggregateOutputType | null
    _avg: FornecedorAvgAggregateOutputType | null
    _sum: FornecedorSumAggregateOutputType | null
    _min: FornecedorMinAggregateOutputType | null
    _max: FornecedorMaxAggregateOutputType | null
  }

  type GetFornecedorGroupByPayload<T extends FornecedorGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<FornecedorGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof FornecedorGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], FornecedorGroupByOutputType[P]>
            : GetScalarType<T[P], FornecedorGroupByOutputType[P]>
        }
      >
    >


  export type FornecedorSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    nome?: boolean
    telefone?: boolean
    produtos?: boolean | Fornecedor$produtosArgs<ExtArgs>
    _count?: boolean | FornecedorCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["fornecedor"]>

  export type FornecedorSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    nome?: boolean
    telefone?: boolean
  }, ExtArgs["result"]["fornecedor"]>

  export type FornecedorSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    nome?: boolean
    telefone?: boolean
  }, ExtArgs["result"]["fornecedor"]>

  export type FornecedorSelectScalar = {
    id?: boolean
    nome?: boolean
    telefone?: boolean
  }

  export type FornecedorOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "nome" | "telefone", ExtArgs["result"]["fornecedor"]>
  export type FornecedorInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    produtos?: boolean | Fornecedor$produtosArgs<ExtArgs>
    _count?: boolean | FornecedorCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type FornecedorIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type FornecedorIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $FornecedorPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Fornecedor"
    objects: {
      produtos: Prisma.$ProdutoPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      nome: string
      telefone: string | null
    }, ExtArgs["result"]["fornecedor"]>
    composites: {}
  }

  type FornecedorGetPayload<S extends boolean | null | undefined | FornecedorDefaultArgs> = $Result.GetResult<Prisma.$FornecedorPayload, S>

  type FornecedorCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<FornecedorFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: FornecedorCountAggregateInputType | true
    }

  export interface FornecedorDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Fornecedor'], meta: { name: 'Fornecedor' } }
    /**
     * Find zero or one Fornecedor that matches the filter.
     * @param {FornecedorFindUniqueArgs} args - Arguments to find a Fornecedor
     * @example
     * // Get one Fornecedor
     * const fornecedor = await prisma.fornecedor.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends FornecedorFindUniqueArgs>(args: SelectSubset<T, FornecedorFindUniqueArgs<ExtArgs>>): Prisma__FornecedorClient<$Result.GetResult<Prisma.$FornecedorPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Fornecedor that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {FornecedorFindUniqueOrThrowArgs} args - Arguments to find a Fornecedor
     * @example
     * // Get one Fornecedor
     * const fornecedor = await prisma.fornecedor.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends FornecedorFindUniqueOrThrowArgs>(args: SelectSubset<T, FornecedorFindUniqueOrThrowArgs<ExtArgs>>): Prisma__FornecedorClient<$Result.GetResult<Prisma.$FornecedorPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Fornecedor that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FornecedorFindFirstArgs} args - Arguments to find a Fornecedor
     * @example
     * // Get one Fornecedor
     * const fornecedor = await prisma.fornecedor.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends FornecedorFindFirstArgs>(args?: SelectSubset<T, FornecedorFindFirstArgs<ExtArgs>>): Prisma__FornecedorClient<$Result.GetResult<Prisma.$FornecedorPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Fornecedor that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FornecedorFindFirstOrThrowArgs} args - Arguments to find a Fornecedor
     * @example
     * // Get one Fornecedor
     * const fornecedor = await prisma.fornecedor.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends FornecedorFindFirstOrThrowArgs>(args?: SelectSubset<T, FornecedorFindFirstOrThrowArgs<ExtArgs>>): Prisma__FornecedorClient<$Result.GetResult<Prisma.$FornecedorPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Fornecedors that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FornecedorFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Fornecedors
     * const fornecedors = await prisma.fornecedor.findMany()
     * 
     * // Get first 10 Fornecedors
     * const fornecedors = await prisma.fornecedor.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const fornecedorWithIdOnly = await prisma.fornecedor.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends FornecedorFindManyArgs>(args?: SelectSubset<T, FornecedorFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FornecedorPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Fornecedor.
     * @param {FornecedorCreateArgs} args - Arguments to create a Fornecedor.
     * @example
     * // Create one Fornecedor
     * const Fornecedor = await prisma.fornecedor.create({
     *   data: {
     *     // ... data to create a Fornecedor
     *   }
     * })
     * 
     */
    create<T extends FornecedorCreateArgs>(args: SelectSubset<T, FornecedorCreateArgs<ExtArgs>>): Prisma__FornecedorClient<$Result.GetResult<Prisma.$FornecedorPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Fornecedors.
     * @param {FornecedorCreateManyArgs} args - Arguments to create many Fornecedors.
     * @example
     * // Create many Fornecedors
     * const fornecedor = await prisma.fornecedor.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends FornecedorCreateManyArgs>(args?: SelectSubset<T, FornecedorCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Fornecedors and returns the data saved in the database.
     * @param {FornecedorCreateManyAndReturnArgs} args - Arguments to create many Fornecedors.
     * @example
     * // Create many Fornecedors
     * const fornecedor = await prisma.fornecedor.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Fornecedors and only return the `id`
     * const fornecedorWithIdOnly = await prisma.fornecedor.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends FornecedorCreateManyAndReturnArgs>(args?: SelectSubset<T, FornecedorCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FornecedorPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Fornecedor.
     * @param {FornecedorDeleteArgs} args - Arguments to delete one Fornecedor.
     * @example
     * // Delete one Fornecedor
     * const Fornecedor = await prisma.fornecedor.delete({
     *   where: {
     *     // ... filter to delete one Fornecedor
     *   }
     * })
     * 
     */
    delete<T extends FornecedorDeleteArgs>(args: SelectSubset<T, FornecedorDeleteArgs<ExtArgs>>): Prisma__FornecedorClient<$Result.GetResult<Prisma.$FornecedorPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Fornecedor.
     * @param {FornecedorUpdateArgs} args - Arguments to update one Fornecedor.
     * @example
     * // Update one Fornecedor
     * const fornecedor = await prisma.fornecedor.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends FornecedorUpdateArgs>(args: SelectSubset<T, FornecedorUpdateArgs<ExtArgs>>): Prisma__FornecedorClient<$Result.GetResult<Prisma.$FornecedorPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Fornecedors.
     * @param {FornecedorDeleteManyArgs} args - Arguments to filter Fornecedors to delete.
     * @example
     * // Delete a few Fornecedors
     * const { count } = await prisma.fornecedor.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends FornecedorDeleteManyArgs>(args?: SelectSubset<T, FornecedorDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Fornecedors.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FornecedorUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Fornecedors
     * const fornecedor = await prisma.fornecedor.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends FornecedorUpdateManyArgs>(args: SelectSubset<T, FornecedorUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Fornecedors and returns the data updated in the database.
     * @param {FornecedorUpdateManyAndReturnArgs} args - Arguments to update many Fornecedors.
     * @example
     * // Update many Fornecedors
     * const fornecedor = await prisma.fornecedor.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Fornecedors and only return the `id`
     * const fornecedorWithIdOnly = await prisma.fornecedor.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends FornecedorUpdateManyAndReturnArgs>(args: SelectSubset<T, FornecedorUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FornecedorPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Fornecedor.
     * @param {FornecedorUpsertArgs} args - Arguments to update or create a Fornecedor.
     * @example
     * // Update or create a Fornecedor
     * const fornecedor = await prisma.fornecedor.upsert({
     *   create: {
     *     // ... data to create a Fornecedor
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Fornecedor we want to update
     *   }
     * })
     */
    upsert<T extends FornecedorUpsertArgs>(args: SelectSubset<T, FornecedorUpsertArgs<ExtArgs>>): Prisma__FornecedorClient<$Result.GetResult<Prisma.$FornecedorPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Fornecedors.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FornecedorCountArgs} args - Arguments to filter Fornecedors to count.
     * @example
     * // Count the number of Fornecedors
     * const count = await prisma.fornecedor.count({
     *   where: {
     *     // ... the filter for the Fornecedors we want to count
     *   }
     * })
    **/
    count<T extends FornecedorCountArgs>(
      args?: Subset<T, FornecedorCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], FornecedorCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Fornecedor.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FornecedorAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends FornecedorAggregateArgs>(args: Subset<T, FornecedorAggregateArgs>): Prisma.PrismaPromise<GetFornecedorAggregateType<T>>

    /**
     * Group by Fornecedor.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FornecedorGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends FornecedorGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: FornecedorGroupByArgs['orderBy'] }
        : { orderBy?: FornecedorGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, FornecedorGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetFornecedorGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Fornecedor model
   */
  readonly fields: FornecedorFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Fornecedor.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__FornecedorClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    produtos<T extends Fornecedor$produtosArgs<ExtArgs> = {}>(args?: Subset<T, Fornecedor$produtosArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProdutoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Fornecedor model
   */
  interface FornecedorFieldRefs {
    readonly id: FieldRef<"Fornecedor", 'Int'>
    readonly nome: FieldRef<"Fornecedor", 'String'>
    readonly telefone: FieldRef<"Fornecedor", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Fornecedor findUnique
   */
  export type FornecedorFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Fornecedor
     */
    select?: FornecedorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Fornecedor
     */
    omit?: FornecedorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FornecedorInclude<ExtArgs> | null
    /**
     * Filter, which Fornecedor to fetch.
     */
    where: FornecedorWhereUniqueInput
  }

  /**
   * Fornecedor findUniqueOrThrow
   */
  export type FornecedorFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Fornecedor
     */
    select?: FornecedorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Fornecedor
     */
    omit?: FornecedorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FornecedorInclude<ExtArgs> | null
    /**
     * Filter, which Fornecedor to fetch.
     */
    where: FornecedorWhereUniqueInput
  }

  /**
   * Fornecedor findFirst
   */
  export type FornecedorFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Fornecedor
     */
    select?: FornecedorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Fornecedor
     */
    omit?: FornecedorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FornecedorInclude<ExtArgs> | null
    /**
     * Filter, which Fornecedor to fetch.
     */
    where?: FornecedorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Fornecedors to fetch.
     */
    orderBy?: FornecedorOrderByWithRelationInput | FornecedorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Fornecedors.
     */
    cursor?: FornecedorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Fornecedors from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Fornecedors.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Fornecedors.
     */
    distinct?: FornecedorScalarFieldEnum | FornecedorScalarFieldEnum[]
  }

  /**
   * Fornecedor findFirstOrThrow
   */
  export type FornecedorFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Fornecedor
     */
    select?: FornecedorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Fornecedor
     */
    omit?: FornecedorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FornecedorInclude<ExtArgs> | null
    /**
     * Filter, which Fornecedor to fetch.
     */
    where?: FornecedorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Fornecedors to fetch.
     */
    orderBy?: FornecedorOrderByWithRelationInput | FornecedorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Fornecedors.
     */
    cursor?: FornecedorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Fornecedors from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Fornecedors.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Fornecedors.
     */
    distinct?: FornecedorScalarFieldEnum | FornecedorScalarFieldEnum[]
  }

  /**
   * Fornecedor findMany
   */
  export type FornecedorFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Fornecedor
     */
    select?: FornecedorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Fornecedor
     */
    omit?: FornecedorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FornecedorInclude<ExtArgs> | null
    /**
     * Filter, which Fornecedors to fetch.
     */
    where?: FornecedorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Fornecedors to fetch.
     */
    orderBy?: FornecedorOrderByWithRelationInput | FornecedorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Fornecedors.
     */
    cursor?: FornecedorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Fornecedors from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Fornecedors.
     */
    skip?: number
    distinct?: FornecedorScalarFieldEnum | FornecedorScalarFieldEnum[]
  }

  /**
   * Fornecedor create
   */
  export type FornecedorCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Fornecedor
     */
    select?: FornecedorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Fornecedor
     */
    omit?: FornecedorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FornecedorInclude<ExtArgs> | null
    /**
     * The data needed to create a Fornecedor.
     */
    data: XOR<FornecedorCreateInput, FornecedorUncheckedCreateInput>
  }

  /**
   * Fornecedor createMany
   */
  export type FornecedorCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Fornecedors.
     */
    data: FornecedorCreateManyInput | FornecedorCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Fornecedor createManyAndReturn
   */
  export type FornecedorCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Fornecedor
     */
    select?: FornecedorSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Fornecedor
     */
    omit?: FornecedorOmit<ExtArgs> | null
    /**
     * The data used to create many Fornecedors.
     */
    data: FornecedorCreateManyInput | FornecedorCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Fornecedor update
   */
  export type FornecedorUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Fornecedor
     */
    select?: FornecedorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Fornecedor
     */
    omit?: FornecedorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FornecedorInclude<ExtArgs> | null
    /**
     * The data needed to update a Fornecedor.
     */
    data: XOR<FornecedorUpdateInput, FornecedorUncheckedUpdateInput>
    /**
     * Choose, which Fornecedor to update.
     */
    where: FornecedorWhereUniqueInput
  }

  /**
   * Fornecedor updateMany
   */
  export type FornecedorUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Fornecedors.
     */
    data: XOR<FornecedorUpdateManyMutationInput, FornecedorUncheckedUpdateManyInput>
    /**
     * Filter which Fornecedors to update
     */
    where?: FornecedorWhereInput
    /**
     * Limit how many Fornecedors to update.
     */
    limit?: number
  }

  /**
   * Fornecedor updateManyAndReturn
   */
  export type FornecedorUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Fornecedor
     */
    select?: FornecedorSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Fornecedor
     */
    omit?: FornecedorOmit<ExtArgs> | null
    /**
     * The data used to update Fornecedors.
     */
    data: XOR<FornecedorUpdateManyMutationInput, FornecedorUncheckedUpdateManyInput>
    /**
     * Filter which Fornecedors to update
     */
    where?: FornecedorWhereInput
    /**
     * Limit how many Fornecedors to update.
     */
    limit?: number
  }

  /**
   * Fornecedor upsert
   */
  export type FornecedorUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Fornecedor
     */
    select?: FornecedorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Fornecedor
     */
    omit?: FornecedorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FornecedorInclude<ExtArgs> | null
    /**
     * The filter to search for the Fornecedor to update in case it exists.
     */
    where: FornecedorWhereUniqueInput
    /**
     * In case the Fornecedor found by the `where` argument doesn't exist, create a new Fornecedor with this data.
     */
    create: XOR<FornecedorCreateInput, FornecedorUncheckedCreateInput>
    /**
     * In case the Fornecedor was found with the provided `where` argument, update it with this data.
     */
    update: XOR<FornecedorUpdateInput, FornecedorUncheckedUpdateInput>
  }

  /**
   * Fornecedor delete
   */
  export type FornecedorDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Fornecedor
     */
    select?: FornecedorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Fornecedor
     */
    omit?: FornecedorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FornecedorInclude<ExtArgs> | null
    /**
     * Filter which Fornecedor to delete.
     */
    where: FornecedorWhereUniqueInput
  }

  /**
   * Fornecedor deleteMany
   */
  export type FornecedorDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Fornecedors to delete
     */
    where?: FornecedorWhereInput
    /**
     * Limit how many Fornecedors to delete.
     */
    limit?: number
  }

  /**
   * Fornecedor.produtos
   */
  export type Fornecedor$produtosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Produto
     */
    select?: ProdutoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Produto
     */
    omit?: ProdutoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProdutoInclude<ExtArgs> | null
    where?: ProdutoWhereInput
    orderBy?: ProdutoOrderByWithRelationInput | ProdutoOrderByWithRelationInput[]
    cursor?: ProdutoWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ProdutoScalarFieldEnum | ProdutoScalarFieldEnum[]
  }

  /**
   * Fornecedor without action
   */
  export type FornecedorDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Fornecedor
     */
    select?: FornecedorSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Fornecedor
     */
    omit?: FornecedorOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FornecedorInclude<ExtArgs> | null
  }


  /**
   * Model EmpresaParceira
   */

  export type AggregateEmpresaParceira = {
    _count: EmpresaParceiraCountAggregateOutputType | null
    _avg: EmpresaParceiraAvgAggregateOutputType | null
    _sum: EmpresaParceiraSumAggregateOutputType | null
    _min: EmpresaParceiraMinAggregateOutputType | null
    _max: EmpresaParceiraMaxAggregateOutputType | null
  }

  export type EmpresaParceiraAvgAggregateOutputType = {
    id: number | null
  }

  export type EmpresaParceiraSumAggregateOutputType = {
    id: number | null
  }

  export type EmpresaParceiraMinAggregateOutputType = {
    id: number | null
    nome: string | null
    responsavelRh: string | null
    telefoneRh: string | null
    emailRh: string | null
  }

  export type EmpresaParceiraMaxAggregateOutputType = {
    id: number | null
    nome: string | null
    responsavelRh: string | null
    telefoneRh: string | null
    emailRh: string | null
  }

  export type EmpresaParceiraCountAggregateOutputType = {
    id: number
    nome: number
    responsavelRh: number
    telefoneRh: number
    emailRh: number
    _all: number
  }


  export type EmpresaParceiraAvgAggregateInputType = {
    id?: true
  }

  export type EmpresaParceiraSumAggregateInputType = {
    id?: true
  }

  export type EmpresaParceiraMinAggregateInputType = {
    id?: true
    nome?: true
    responsavelRh?: true
    telefoneRh?: true
    emailRh?: true
  }

  export type EmpresaParceiraMaxAggregateInputType = {
    id?: true
    nome?: true
    responsavelRh?: true
    telefoneRh?: true
    emailRh?: true
  }

  export type EmpresaParceiraCountAggregateInputType = {
    id?: true
    nome?: true
    responsavelRh?: true
    telefoneRh?: true
    emailRh?: true
    _all?: true
  }

  export type EmpresaParceiraAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which EmpresaParceira to aggregate.
     */
    where?: EmpresaParceiraWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of EmpresaParceiras to fetch.
     */
    orderBy?: EmpresaParceiraOrderByWithRelationInput | EmpresaParceiraOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: EmpresaParceiraWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` EmpresaParceiras from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` EmpresaParceiras.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned EmpresaParceiras
    **/
    _count?: true | EmpresaParceiraCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: EmpresaParceiraAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: EmpresaParceiraSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: EmpresaParceiraMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: EmpresaParceiraMaxAggregateInputType
  }

  export type GetEmpresaParceiraAggregateType<T extends EmpresaParceiraAggregateArgs> = {
        [P in keyof T & keyof AggregateEmpresaParceira]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateEmpresaParceira[P]>
      : GetScalarType<T[P], AggregateEmpresaParceira[P]>
  }




  export type EmpresaParceiraGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: EmpresaParceiraWhereInput
    orderBy?: EmpresaParceiraOrderByWithAggregationInput | EmpresaParceiraOrderByWithAggregationInput[]
    by: EmpresaParceiraScalarFieldEnum[] | EmpresaParceiraScalarFieldEnum
    having?: EmpresaParceiraScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: EmpresaParceiraCountAggregateInputType | true
    _avg?: EmpresaParceiraAvgAggregateInputType
    _sum?: EmpresaParceiraSumAggregateInputType
    _min?: EmpresaParceiraMinAggregateInputType
    _max?: EmpresaParceiraMaxAggregateInputType
  }

  export type EmpresaParceiraGroupByOutputType = {
    id: number
    nome: string
    responsavelRh: string | null
    telefoneRh: string | null
    emailRh: string | null
    _count: EmpresaParceiraCountAggregateOutputType | null
    _avg: EmpresaParceiraAvgAggregateOutputType | null
    _sum: EmpresaParceiraSumAggregateOutputType | null
    _min: EmpresaParceiraMinAggregateOutputType | null
    _max: EmpresaParceiraMaxAggregateOutputType | null
  }

  type GetEmpresaParceiraGroupByPayload<T extends EmpresaParceiraGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<EmpresaParceiraGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof EmpresaParceiraGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], EmpresaParceiraGroupByOutputType[P]>
            : GetScalarType<T[P], EmpresaParceiraGroupByOutputType[P]>
        }
      >
    >


  export type EmpresaParceiraSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    nome?: boolean
    responsavelRh?: boolean
    telefoneRh?: boolean
    emailRh?: boolean
  }, ExtArgs["result"]["empresaParceira"]>

  export type EmpresaParceiraSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    nome?: boolean
    responsavelRh?: boolean
    telefoneRh?: boolean
    emailRh?: boolean
  }, ExtArgs["result"]["empresaParceira"]>

  export type EmpresaParceiraSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    nome?: boolean
    responsavelRh?: boolean
    telefoneRh?: boolean
    emailRh?: boolean
  }, ExtArgs["result"]["empresaParceira"]>

  export type EmpresaParceiraSelectScalar = {
    id?: boolean
    nome?: boolean
    responsavelRh?: boolean
    telefoneRh?: boolean
    emailRh?: boolean
  }

  export type EmpresaParceiraOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "nome" | "responsavelRh" | "telefoneRh" | "emailRh", ExtArgs["result"]["empresaParceira"]>

  export type $EmpresaParceiraPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "EmpresaParceira"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      nome: string
      responsavelRh: string | null
      telefoneRh: string | null
      emailRh: string | null
    }, ExtArgs["result"]["empresaParceira"]>
    composites: {}
  }

  type EmpresaParceiraGetPayload<S extends boolean | null | undefined | EmpresaParceiraDefaultArgs> = $Result.GetResult<Prisma.$EmpresaParceiraPayload, S>

  type EmpresaParceiraCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<EmpresaParceiraFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: EmpresaParceiraCountAggregateInputType | true
    }

  export interface EmpresaParceiraDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['EmpresaParceira'], meta: { name: 'EmpresaParceira' } }
    /**
     * Find zero or one EmpresaParceira that matches the filter.
     * @param {EmpresaParceiraFindUniqueArgs} args - Arguments to find a EmpresaParceira
     * @example
     * // Get one EmpresaParceira
     * const empresaParceira = await prisma.empresaParceira.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends EmpresaParceiraFindUniqueArgs>(args: SelectSubset<T, EmpresaParceiraFindUniqueArgs<ExtArgs>>): Prisma__EmpresaParceiraClient<$Result.GetResult<Prisma.$EmpresaParceiraPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one EmpresaParceira that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {EmpresaParceiraFindUniqueOrThrowArgs} args - Arguments to find a EmpresaParceira
     * @example
     * // Get one EmpresaParceira
     * const empresaParceira = await prisma.empresaParceira.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends EmpresaParceiraFindUniqueOrThrowArgs>(args: SelectSubset<T, EmpresaParceiraFindUniqueOrThrowArgs<ExtArgs>>): Prisma__EmpresaParceiraClient<$Result.GetResult<Prisma.$EmpresaParceiraPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first EmpresaParceira that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EmpresaParceiraFindFirstArgs} args - Arguments to find a EmpresaParceira
     * @example
     * // Get one EmpresaParceira
     * const empresaParceira = await prisma.empresaParceira.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends EmpresaParceiraFindFirstArgs>(args?: SelectSubset<T, EmpresaParceiraFindFirstArgs<ExtArgs>>): Prisma__EmpresaParceiraClient<$Result.GetResult<Prisma.$EmpresaParceiraPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first EmpresaParceira that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EmpresaParceiraFindFirstOrThrowArgs} args - Arguments to find a EmpresaParceira
     * @example
     * // Get one EmpresaParceira
     * const empresaParceira = await prisma.empresaParceira.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends EmpresaParceiraFindFirstOrThrowArgs>(args?: SelectSubset<T, EmpresaParceiraFindFirstOrThrowArgs<ExtArgs>>): Prisma__EmpresaParceiraClient<$Result.GetResult<Prisma.$EmpresaParceiraPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more EmpresaParceiras that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EmpresaParceiraFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all EmpresaParceiras
     * const empresaParceiras = await prisma.empresaParceira.findMany()
     * 
     * // Get first 10 EmpresaParceiras
     * const empresaParceiras = await prisma.empresaParceira.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const empresaParceiraWithIdOnly = await prisma.empresaParceira.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends EmpresaParceiraFindManyArgs>(args?: SelectSubset<T, EmpresaParceiraFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EmpresaParceiraPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a EmpresaParceira.
     * @param {EmpresaParceiraCreateArgs} args - Arguments to create a EmpresaParceira.
     * @example
     * // Create one EmpresaParceira
     * const EmpresaParceira = await prisma.empresaParceira.create({
     *   data: {
     *     // ... data to create a EmpresaParceira
     *   }
     * })
     * 
     */
    create<T extends EmpresaParceiraCreateArgs>(args: SelectSubset<T, EmpresaParceiraCreateArgs<ExtArgs>>): Prisma__EmpresaParceiraClient<$Result.GetResult<Prisma.$EmpresaParceiraPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many EmpresaParceiras.
     * @param {EmpresaParceiraCreateManyArgs} args - Arguments to create many EmpresaParceiras.
     * @example
     * // Create many EmpresaParceiras
     * const empresaParceira = await prisma.empresaParceira.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends EmpresaParceiraCreateManyArgs>(args?: SelectSubset<T, EmpresaParceiraCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many EmpresaParceiras and returns the data saved in the database.
     * @param {EmpresaParceiraCreateManyAndReturnArgs} args - Arguments to create many EmpresaParceiras.
     * @example
     * // Create many EmpresaParceiras
     * const empresaParceira = await prisma.empresaParceira.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many EmpresaParceiras and only return the `id`
     * const empresaParceiraWithIdOnly = await prisma.empresaParceira.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends EmpresaParceiraCreateManyAndReturnArgs>(args?: SelectSubset<T, EmpresaParceiraCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EmpresaParceiraPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a EmpresaParceira.
     * @param {EmpresaParceiraDeleteArgs} args - Arguments to delete one EmpresaParceira.
     * @example
     * // Delete one EmpresaParceira
     * const EmpresaParceira = await prisma.empresaParceira.delete({
     *   where: {
     *     // ... filter to delete one EmpresaParceira
     *   }
     * })
     * 
     */
    delete<T extends EmpresaParceiraDeleteArgs>(args: SelectSubset<T, EmpresaParceiraDeleteArgs<ExtArgs>>): Prisma__EmpresaParceiraClient<$Result.GetResult<Prisma.$EmpresaParceiraPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one EmpresaParceira.
     * @param {EmpresaParceiraUpdateArgs} args - Arguments to update one EmpresaParceira.
     * @example
     * // Update one EmpresaParceira
     * const empresaParceira = await prisma.empresaParceira.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends EmpresaParceiraUpdateArgs>(args: SelectSubset<T, EmpresaParceiraUpdateArgs<ExtArgs>>): Prisma__EmpresaParceiraClient<$Result.GetResult<Prisma.$EmpresaParceiraPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more EmpresaParceiras.
     * @param {EmpresaParceiraDeleteManyArgs} args - Arguments to filter EmpresaParceiras to delete.
     * @example
     * // Delete a few EmpresaParceiras
     * const { count } = await prisma.empresaParceira.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends EmpresaParceiraDeleteManyArgs>(args?: SelectSubset<T, EmpresaParceiraDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more EmpresaParceiras.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EmpresaParceiraUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many EmpresaParceiras
     * const empresaParceira = await prisma.empresaParceira.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends EmpresaParceiraUpdateManyArgs>(args: SelectSubset<T, EmpresaParceiraUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more EmpresaParceiras and returns the data updated in the database.
     * @param {EmpresaParceiraUpdateManyAndReturnArgs} args - Arguments to update many EmpresaParceiras.
     * @example
     * // Update many EmpresaParceiras
     * const empresaParceira = await prisma.empresaParceira.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more EmpresaParceiras and only return the `id`
     * const empresaParceiraWithIdOnly = await prisma.empresaParceira.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends EmpresaParceiraUpdateManyAndReturnArgs>(args: SelectSubset<T, EmpresaParceiraUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EmpresaParceiraPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one EmpresaParceira.
     * @param {EmpresaParceiraUpsertArgs} args - Arguments to update or create a EmpresaParceira.
     * @example
     * // Update or create a EmpresaParceira
     * const empresaParceira = await prisma.empresaParceira.upsert({
     *   create: {
     *     // ... data to create a EmpresaParceira
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the EmpresaParceira we want to update
     *   }
     * })
     */
    upsert<T extends EmpresaParceiraUpsertArgs>(args: SelectSubset<T, EmpresaParceiraUpsertArgs<ExtArgs>>): Prisma__EmpresaParceiraClient<$Result.GetResult<Prisma.$EmpresaParceiraPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of EmpresaParceiras.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EmpresaParceiraCountArgs} args - Arguments to filter EmpresaParceiras to count.
     * @example
     * // Count the number of EmpresaParceiras
     * const count = await prisma.empresaParceira.count({
     *   where: {
     *     // ... the filter for the EmpresaParceiras we want to count
     *   }
     * })
    **/
    count<T extends EmpresaParceiraCountArgs>(
      args?: Subset<T, EmpresaParceiraCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], EmpresaParceiraCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a EmpresaParceira.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EmpresaParceiraAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends EmpresaParceiraAggregateArgs>(args: Subset<T, EmpresaParceiraAggregateArgs>): Prisma.PrismaPromise<GetEmpresaParceiraAggregateType<T>>

    /**
     * Group by EmpresaParceira.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EmpresaParceiraGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends EmpresaParceiraGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: EmpresaParceiraGroupByArgs['orderBy'] }
        : { orderBy?: EmpresaParceiraGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, EmpresaParceiraGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetEmpresaParceiraGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the EmpresaParceira model
   */
  readonly fields: EmpresaParceiraFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for EmpresaParceira.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__EmpresaParceiraClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the EmpresaParceira model
   */
  interface EmpresaParceiraFieldRefs {
    readonly id: FieldRef<"EmpresaParceira", 'Int'>
    readonly nome: FieldRef<"EmpresaParceira", 'String'>
    readonly responsavelRh: FieldRef<"EmpresaParceira", 'String'>
    readonly telefoneRh: FieldRef<"EmpresaParceira", 'String'>
    readonly emailRh: FieldRef<"EmpresaParceira", 'String'>
  }
    

  // Custom InputTypes
  /**
   * EmpresaParceira findUnique
   */
  export type EmpresaParceiraFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EmpresaParceira
     */
    select?: EmpresaParceiraSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EmpresaParceira
     */
    omit?: EmpresaParceiraOmit<ExtArgs> | null
    /**
     * Filter, which EmpresaParceira to fetch.
     */
    where: EmpresaParceiraWhereUniqueInput
  }

  /**
   * EmpresaParceira findUniqueOrThrow
   */
  export type EmpresaParceiraFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EmpresaParceira
     */
    select?: EmpresaParceiraSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EmpresaParceira
     */
    omit?: EmpresaParceiraOmit<ExtArgs> | null
    /**
     * Filter, which EmpresaParceira to fetch.
     */
    where: EmpresaParceiraWhereUniqueInput
  }

  /**
   * EmpresaParceira findFirst
   */
  export type EmpresaParceiraFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EmpresaParceira
     */
    select?: EmpresaParceiraSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EmpresaParceira
     */
    omit?: EmpresaParceiraOmit<ExtArgs> | null
    /**
     * Filter, which EmpresaParceira to fetch.
     */
    where?: EmpresaParceiraWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of EmpresaParceiras to fetch.
     */
    orderBy?: EmpresaParceiraOrderByWithRelationInput | EmpresaParceiraOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for EmpresaParceiras.
     */
    cursor?: EmpresaParceiraWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` EmpresaParceiras from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` EmpresaParceiras.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of EmpresaParceiras.
     */
    distinct?: EmpresaParceiraScalarFieldEnum | EmpresaParceiraScalarFieldEnum[]
  }

  /**
   * EmpresaParceira findFirstOrThrow
   */
  export type EmpresaParceiraFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EmpresaParceira
     */
    select?: EmpresaParceiraSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EmpresaParceira
     */
    omit?: EmpresaParceiraOmit<ExtArgs> | null
    /**
     * Filter, which EmpresaParceira to fetch.
     */
    where?: EmpresaParceiraWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of EmpresaParceiras to fetch.
     */
    orderBy?: EmpresaParceiraOrderByWithRelationInput | EmpresaParceiraOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for EmpresaParceiras.
     */
    cursor?: EmpresaParceiraWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` EmpresaParceiras from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` EmpresaParceiras.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of EmpresaParceiras.
     */
    distinct?: EmpresaParceiraScalarFieldEnum | EmpresaParceiraScalarFieldEnum[]
  }

  /**
   * EmpresaParceira findMany
   */
  export type EmpresaParceiraFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EmpresaParceira
     */
    select?: EmpresaParceiraSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EmpresaParceira
     */
    omit?: EmpresaParceiraOmit<ExtArgs> | null
    /**
     * Filter, which EmpresaParceiras to fetch.
     */
    where?: EmpresaParceiraWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of EmpresaParceiras to fetch.
     */
    orderBy?: EmpresaParceiraOrderByWithRelationInput | EmpresaParceiraOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing EmpresaParceiras.
     */
    cursor?: EmpresaParceiraWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` EmpresaParceiras from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` EmpresaParceiras.
     */
    skip?: number
    distinct?: EmpresaParceiraScalarFieldEnum | EmpresaParceiraScalarFieldEnum[]
  }

  /**
   * EmpresaParceira create
   */
  export type EmpresaParceiraCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EmpresaParceira
     */
    select?: EmpresaParceiraSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EmpresaParceira
     */
    omit?: EmpresaParceiraOmit<ExtArgs> | null
    /**
     * The data needed to create a EmpresaParceira.
     */
    data: XOR<EmpresaParceiraCreateInput, EmpresaParceiraUncheckedCreateInput>
  }

  /**
   * EmpresaParceira createMany
   */
  export type EmpresaParceiraCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many EmpresaParceiras.
     */
    data: EmpresaParceiraCreateManyInput | EmpresaParceiraCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * EmpresaParceira createManyAndReturn
   */
  export type EmpresaParceiraCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EmpresaParceira
     */
    select?: EmpresaParceiraSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the EmpresaParceira
     */
    omit?: EmpresaParceiraOmit<ExtArgs> | null
    /**
     * The data used to create many EmpresaParceiras.
     */
    data: EmpresaParceiraCreateManyInput | EmpresaParceiraCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * EmpresaParceira update
   */
  export type EmpresaParceiraUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EmpresaParceira
     */
    select?: EmpresaParceiraSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EmpresaParceira
     */
    omit?: EmpresaParceiraOmit<ExtArgs> | null
    /**
     * The data needed to update a EmpresaParceira.
     */
    data: XOR<EmpresaParceiraUpdateInput, EmpresaParceiraUncheckedUpdateInput>
    /**
     * Choose, which EmpresaParceira to update.
     */
    where: EmpresaParceiraWhereUniqueInput
  }

  /**
   * EmpresaParceira updateMany
   */
  export type EmpresaParceiraUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update EmpresaParceiras.
     */
    data: XOR<EmpresaParceiraUpdateManyMutationInput, EmpresaParceiraUncheckedUpdateManyInput>
    /**
     * Filter which EmpresaParceiras to update
     */
    where?: EmpresaParceiraWhereInput
    /**
     * Limit how many EmpresaParceiras to update.
     */
    limit?: number
  }

  /**
   * EmpresaParceira updateManyAndReturn
   */
  export type EmpresaParceiraUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EmpresaParceira
     */
    select?: EmpresaParceiraSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the EmpresaParceira
     */
    omit?: EmpresaParceiraOmit<ExtArgs> | null
    /**
     * The data used to update EmpresaParceiras.
     */
    data: XOR<EmpresaParceiraUpdateManyMutationInput, EmpresaParceiraUncheckedUpdateManyInput>
    /**
     * Filter which EmpresaParceiras to update
     */
    where?: EmpresaParceiraWhereInput
    /**
     * Limit how many EmpresaParceiras to update.
     */
    limit?: number
  }

  /**
   * EmpresaParceira upsert
   */
  export type EmpresaParceiraUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EmpresaParceira
     */
    select?: EmpresaParceiraSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EmpresaParceira
     */
    omit?: EmpresaParceiraOmit<ExtArgs> | null
    /**
     * The filter to search for the EmpresaParceira to update in case it exists.
     */
    where: EmpresaParceiraWhereUniqueInput
    /**
     * In case the EmpresaParceira found by the `where` argument doesn't exist, create a new EmpresaParceira with this data.
     */
    create: XOR<EmpresaParceiraCreateInput, EmpresaParceiraUncheckedCreateInput>
    /**
     * In case the EmpresaParceira was found with the provided `where` argument, update it with this data.
     */
    update: XOR<EmpresaParceiraUpdateInput, EmpresaParceiraUncheckedUpdateInput>
  }

  /**
   * EmpresaParceira delete
   */
  export type EmpresaParceiraDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EmpresaParceira
     */
    select?: EmpresaParceiraSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EmpresaParceira
     */
    omit?: EmpresaParceiraOmit<ExtArgs> | null
    /**
     * Filter which EmpresaParceira to delete.
     */
    where: EmpresaParceiraWhereUniqueInput
  }

  /**
   * EmpresaParceira deleteMany
   */
  export type EmpresaParceiraDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which EmpresaParceiras to delete
     */
    where?: EmpresaParceiraWhereInput
    /**
     * Limit how many EmpresaParceiras to delete.
     */
    limit?: number
  }

  /**
   * EmpresaParceira without action
   */
  export type EmpresaParceiraDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EmpresaParceira
     */
    select?: EmpresaParceiraSelect<ExtArgs> | null
    /**
     * Omit specific fields from the EmpresaParceira
     */
    omit?: EmpresaParceiraOmit<ExtArgs> | null
  }


  /**
   * Model Pagamento
   */

  export type AggregatePagamento = {
    _count: PagamentoCountAggregateOutputType | null
    _avg: PagamentoAvgAggregateOutputType | null
    _sum: PagamentoSumAggregateOutputType | null
    _min: PagamentoMinAggregateOutputType | null
    _max: PagamentoMaxAggregateOutputType | null
  }

  export type PagamentoAvgAggregateOutputType = {
    id: number | null
    valor: number | null
  }

  export type PagamentoSumAggregateOutputType = {
    id: number | null
    valor: number | null
  }

  export type PagamentoMinAggregateOutputType = {
    id: number | null
    dataPagamento: Date | null
    vendedor: string | null
    valor: number | null
    obs: string | null
  }

  export type PagamentoMaxAggregateOutputType = {
    id: number | null
    dataPagamento: Date | null
    vendedor: string | null
    valor: number | null
    obs: string | null
  }

  export type PagamentoCountAggregateOutputType = {
    id: number
    dataPagamento: number
    vendedor: number
    valor: number
    obs: number
    _all: number
  }


  export type PagamentoAvgAggregateInputType = {
    id?: true
    valor?: true
  }

  export type PagamentoSumAggregateInputType = {
    id?: true
    valor?: true
  }

  export type PagamentoMinAggregateInputType = {
    id?: true
    dataPagamento?: true
    vendedor?: true
    valor?: true
    obs?: true
  }

  export type PagamentoMaxAggregateInputType = {
    id?: true
    dataPagamento?: true
    vendedor?: true
    valor?: true
    obs?: true
  }

  export type PagamentoCountAggregateInputType = {
    id?: true
    dataPagamento?: true
    vendedor?: true
    valor?: true
    obs?: true
    _all?: true
  }

  export type PagamentoAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Pagamento to aggregate.
     */
    where?: PagamentoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Pagamentos to fetch.
     */
    orderBy?: PagamentoOrderByWithRelationInput | PagamentoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PagamentoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Pagamentos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Pagamentos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Pagamentos
    **/
    _count?: true | PagamentoCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: PagamentoAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: PagamentoSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PagamentoMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PagamentoMaxAggregateInputType
  }

  export type GetPagamentoAggregateType<T extends PagamentoAggregateArgs> = {
        [P in keyof T & keyof AggregatePagamento]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePagamento[P]>
      : GetScalarType<T[P], AggregatePagamento[P]>
  }




  export type PagamentoGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PagamentoWhereInput
    orderBy?: PagamentoOrderByWithAggregationInput | PagamentoOrderByWithAggregationInput[]
    by: PagamentoScalarFieldEnum[] | PagamentoScalarFieldEnum
    having?: PagamentoScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PagamentoCountAggregateInputType | true
    _avg?: PagamentoAvgAggregateInputType
    _sum?: PagamentoSumAggregateInputType
    _min?: PagamentoMinAggregateInputType
    _max?: PagamentoMaxAggregateInputType
  }

  export type PagamentoGroupByOutputType = {
    id: number
    dataPagamento: Date
    vendedor: string | null
    valor: number | null
    obs: string | null
    _count: PagamentoCountAggregateOutputType | null
    _avg: PagamentoAvgAggregateOutputType | null
    _sum: PagamentoSumAggregateOutputType | null
    _min: PagamentoMinAggregateOutputType | null
    _max: PagamentoMaxAggregateOutputType | null
  }

  type GetPagamentoGroupByPayload<T extends PagamentoGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PagamentoGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PagamentoGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PagamentoGroupByOutputType[P]>
            : GetScalarType<T[P], PagamentoGroupByOutputType[P]>
        }
      >
    >


  export type PagamentoSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    dataPagamento?: boolean
    vendedor?: boolean
    valor?: boolean
    obs?: boolean
  }, ExtArgs["result"]["pagamento"]>

  export type PagamentoSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    dataPagamento?: boolean
    vendedor?: boolean
    valor?: boolean
    obs?: boolean
  }, ExtArgs["result"]["pagamento"]>

  export type PagamentoSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    dataPagamento?: boolean
    vendedor?: boolean
    valor?: boolean
    obs?: boolean
  }, ExtArgs["result"]["pagamento"]>

  export type PagamentoSelectScalar = {
    id?: boolean
    dataPagamento?: boolean
    vendedor?: boolean
    valor?: boolean
    obs?: boolean
  }

  export type PagamentoOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "dataPagamento" | "vendedor" | "valor" | "obs", ExtArgs["result"]["pagamento"]>

  export type $PagamentoPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Pagamento"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      dataPagamento: Date
      vendedor: string | null
      valor: number | null
      obs: string | null
    }, ExtArgs["result"]["pagamento"]>
    composites: {}
  }

  type PagamentoGetPayload<S extends boolean | null | undefined | PagamentoDefaultArgs> = $Result.GetResult<Prisma.$PagamentoPayload, S>

  type PagamentoCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<PagamentoFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: PagamentoCountAggregateInputType | true
    }

  export interface PagamentoDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Pagamento'], meta: { name: 'Pagamento' } }
    /**
     * Find zero or one Pagamento that matches the filter.
     * @param {PagamentoFindUniqueArgs} args - Arguments to find a Pagamento
     * @example
     * // Get one Pagamento
     * const pagamento = await prisma.pagamento.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends PagamentoFindUniqueArgs>(args: SelectSubset<T, PagamentoFindUniqueArgs<ExtArgs>>): Prisma__PagamentoClient<$Result.GetResult<Prisma.$PagamentoPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Pagamento that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {PagamentoFindUniqueOrThrowArgs} args - Arguments to find a Pagamento
     * @example
     * // Get one Pagamento
     * const pagamento = await prisma.pagamento.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends PagamentoFindUniqueOrThrowArgs>(args: SelectSubset<T, PagamentoFindUniqueOrThrowArgs<ExtArgs>>): Prisma__PagamentoClient<$Result.GetResult<Prisma.$PagamentoPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Pagamento that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PagamentoFindFirstArgs} args - Arguments to find a Pagamento
     * @example
     * // Get one Pagamento
     * const pagamento = await prisma.pagamento.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends PagamentoFindFirstArgs>(args?: SelectSubset<T, PagamentoFindFirstArgs<ExtArgs>>): Prisma__PagamentoClient<$Result.GetResult<Prisma.$PagamentoPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Pagamento that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PagamentoFindFirstOrThrowArgs} args - Arguments to find a Pagamento
     * @example
     * // Get one Pagamento
     * const pagamento = await prisma.pagamento.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends PagamentoFindFirstOrThrowArgs>(args?: SelectSubset<T, PagamentoFindFirstOrThrowArgs<ExtArgs>>): Prisma__PagamentoClient<$Result.GetResult<Prisma.$PagamentoPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Pagamentos that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PagamentoFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Pagamentos
     * const pagamentos = await prisma.pagamento.findMany()
     * 
     * // Get first 10 Pagamentos
     * const pagamentos = await prisma.pagamento.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const pagamentoWithIdOnly = await prisma.pagamento.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends PagamentoFindManyArgs>(args?: SelectSubset<T, PagamentoFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PagamentoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Pagamento.
     * @param {PagamentoCreateArgs} args - Arguments to create a Pagamento.
     * @example
     * // Create one Pagamento
     * const Pagamento = await prisma.pagamento.create({
     *   data: {
     *     // ... data to create a Pagamento
     *   }
     * })
     * 
     */
    create<T extends PagamentoCreateArgs>(args: SelectSubset<T, PagamentoCreateArgs<ExtArgs>>): Prisma__PagamentoClient<$Result.GetResult<Prisma.$PagamentoPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Pagamentos.
     * @param {PagamentoCreateManyArgs} args - Arguments to create many Pagamentos.
     * @example
     * // Create many Pagamentos
     * const pagamento = await prisma.pagamento.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends PagamentoCreateManyArgs>(args?: SelectSubset<T, PagamentoCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Pagamentos and returns the data saved in the database.
     * @param {PagamentoCreateManyAndReturnArgs} args - Arguments to create many Pagamentos.
     * @example
     * // Create many Pagamentos
     * const pagamento = await prisma.pagamento.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Pagamentos and only return the `id`
     * const pagamentoWithIdOnly = await prisma.pagamento.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends PagamentoCreateManyAndReturnArgs>(args?: SelectSubset<T, PagamentoCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PagamentoPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Pagamento.
     * @param {PagamentoDeleteArgs} args - Arguments to delete one Pagamento.
     * @example
     * // Delete one Pagamento
     * const Pagamento = await prisma.pagamento.delete({
     *   where: {
     *     // ... filter to delete one Pagamento
     *   }
     * })
     * 
     */
    delete<T extends PagamentoDeleteArgs>(args: SelectSubset<T, PagamentoDeleteArgs<ExtArgs>>): Prisma__PagamentoClient<$Result.GetResult<Prisma.$PagamentoPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Pagamento.
     * @param {PagamentoUpdateArgs} args - Arguments to update one Pagamento.
     * @example
     * // Update one Pagamento
     * const pagamento = await prisma.pagamento.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends PagamentoUpdateArgs>(args: SelectSubset<T, PagamentoUpdateArgs<ExtArgs>>): Prisma__PagamentoClient<$Result.GetResult<Prisma.$PagamentoPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Pagamentos.
     * @param {PagamentoDeleteManyArgs} args - Arguments to filter Pagamentos to delete.
     * @example
     * // Delete a few Pagamentos
     * const { count } = await prisma.pagamento.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends PagamentoDeleteManyArgs>(args?: SelectSubset<T, PagamentoDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Pagamentos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PagamentoUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Pagamentos
     * const pagamento = await prisma.pagamento.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends PagamentoUpdateManyArgs>(args: SelectSubset<T, PagamentoUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Pagamentos and returns the data updated in the database.
     * @param {PagamentoUpdateManyAndReturnArgs} args - Arguments to update many Pagamentos.
     * @example
     * // Update many Pagamentos
     * const pagamento = await prisma.pagamento.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Pagamentos and only return the `id`
     * const pagamentoWithIdOnly = await prisma.pagamento.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends PagamentoUpdateManyAndReturnArgs>(args: SelectSubset<T, PagamentoUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PagamentoPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Pagamento.
     * @param {PagamentoUpsertArgs} args - Arguments to update or create a Pagamento.
     * @example
     * // Update or create a Pagamento
     * const pagamento = await prisma.pagamento.upsert({
     *   create: {
     *     // ... data to create a Pagamento
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Pagamento we want to update
     *   }
     * })
     */
    upsert<T extends PagamentoUpsertArgs>(args: SelectSubset<T, PagamentoUpsertArgs<ExtArgs>>): Prisma__PagamentoClient<$Result.GetResult<Prisma.$PagamentoPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Pagamentos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PagamentoCountArgs} args - Arguments to filter Pagamentos to count.
     * @example
     * // Count the number of Pagamentos
     * const count = await prisma.pagamento.count({
     *   where: {
     *     // ... the filter for the Pagamentos we want to count
     *   }
     * })
    **/
    count<T extends PagamentoCountArgs>(
      args?: Subset<T, PagamentoCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PagamentoCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Pagamento.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PagamentoAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PagamentoAggregateArgs>(args: Subset<T, PagamentoAggregateArgs>): Prisma.PrismaPromise<GetPagamentoAggregateType<T>>

    /**
     * Group by Pagamento.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PagamentoGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends PagamentoGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PagamentoGroupByArgs['orderBy'] }
        : { orderBy?: PagamentoGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, PagamentoGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPagamentoGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Pagamento model
   */
  readonly fields: PagamentoFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Pagamento.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PagamentoClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Pagamento model
   */
  interface PagamentoFieldRefs {
    readonly id: FieldRef<"Pagamento", 'Int'>
    readonly dataPagamento: FieldRef<"Pagamento", 'DateTime'>
    readonly vendedor: FieldRef<"Pagamento", 'String'>
    readonly valor: FieldRef<"Pagamento", 'Float'>
    readonly obs: FieldRef<"Pagamento", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Pagamento findUnique
   */
  export type PagamentoFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pagamento
     */
    select?: PagamentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pagamento
     */
    omit?: PagamentoOmit<ExtArgs> | null
    /**
     * Filter, which Pagamento to fetch.
     */
    where: PagamentoWhereUniqueInput
  }

  /**
   * Pagamento findUniqueOrThrow
   */
  export type PagamentoFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pagamento
     */
    select?: PagamentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pagamento
     */
    omit?: PagamentoOmit<ExtArgs> | null
    /**
     * Filter, which Pagamento to fetch.
     */
    where: PagamentoWhereUniqueInput
  }

  /**
   * Pagamento findFirst
   */
  export type PagamentoFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pagamento
     */
    select?: PagamentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pagamento
     */
    omit?: PagamentoOmit<ExtArgs> | null
    /**
     * Filter, which Pagamento to fetch.
     */
    where?: PagamentoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Pagamentos to fetch.
     */
    orderBy?: PagamentoOrderByWithRelationInput | PagamentoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Pagamentos.
     */
    cursor?: PagamentoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Pagamentos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Pagamentos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Pagamentos.
     */
    distinct?: PagamentoScalarFieldEnum | PagamentoScalarFieldEnum[]
  }

  /**
   * Pagamento findFirstOrThrow
   */
  export type PagamentoFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pagamento
     */
    select?: PagamentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pagamento
     */
    omit?: PagamentoOmit<ExtArgs> | null
    /**
     * Filter, which Pagamento to fetch.
     */
    where?: PagamentoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Pagamentos to fetch.
     */
    orderBy?: PagamentoOrderByWithRelationInput | PagamentoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Pagamentos.
     */
    cursor?: PagamentoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Pagamentos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Pagamentos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Pagamentos.
     */
    distinct?: PagamentoScalarFieldEnum | PagamentoScalarFieldEnum[]
  }

  /**
   * Pagamento findMany
   */
  export type PagamentoFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pagamento
     */
    select?: PagamentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pagamento
     */
    omit?: PagamentoOmit<ExtArgs> | null
    /**
     * Filter, which Pagamentos to fetch.
     */
    where?: PagamentoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Pagamentos to fetch.
     */
    orderBy?: PagamentoOrderByWithRelationInput | PagamentoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Pagamentos.
     */
    cursor?: PagamentoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Pagamentos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Pagamentos.
     */
    skip?: number
    distinct?: PagamentoScalarFieldEnum | PagamentoScalarFieldEnum[]
  }

  /**
   * Pagamento create
   */
  export type PagamentoCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pagamento
     */
    select?: PagamentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pagamento
     */
    omit?: PagamentoOmit<ExtArgs> | null
    /**
     * The data needed to create a Pagamento.
     */
    data: XOR<PagamentoCreateInput, PagamentoUncheckedCreateInput>
  }

  /**
   * Pagamento createMany
   */
  export type PagamentoCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Pagamentos.
     */
    data: PagamentoCreateManyInput | PagamentoCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Pagamento createManyAndReturn
   */
  export type PagamentoCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pagamento
     */
    select?: PagamentoSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Pagamento
     */
    omit?: PagamentoOmit<ExtArgs> | null
    /**
     * The data used to create many Pagamentos.
     */
    data: PagamentoCreateManyInput | PagamentoCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Pagamento update
   */
  export type PagamentoUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pagamento
     */
    select?: PagamentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pagamento
     */
    omit?: PagamentoOmit<ExtArgs> | null
    /**
     * The data needed to update a Pagamento.
     */
    data: XOR<PagamentoUpdateInput, PagamentoUncheckedUpdateInput>
    /**
     * Choose, which Pagamento to update.
     */
    where: PagamentoWhereUniqueInput
  }

  /**
   * Pagamento updateMany
   */
  export type PagamentoUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Pagamentos.
     */
    data: XOR<PagamentoUpdateManyMutationInput, PagamentoUncheckedUpdateManyInput>
    /**
     * Filter which Pagamentos to update
     */
    where?: PagamentoWhereInput
    /**
     * Limit how many Pagamentos to update.
     */
    limit?: number
  }

  /**
   * Pagamento updateManyAndReturn
   */
  export type PagamentoUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pagamento
     */
    select?: PagamentoSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Pagamento
     */
    omit?: PagamentoOmit<ExtArgs> | null
    /**
     * The data used to update Pagamentos.
     */
    data: XOR<PagamentoUpdateManyMutationInput, PagamentoUncheckedUpdateManyInput>
    /**
     * Filter which Pagamentos to update
     */
    where?: PagamentoWhereInput
    /**
     * Limit how many Pagamentos to update.
     */
    limit?: number
  }

  /**
   * Pagamento upsert
   */
  export type PagamentoUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pagamento
     */
    select?: PagamentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pagamento
     */
    omit?: PagamentoOmit<ExtArgs> | null
    /**
     * The filter to search for the Pagamento to update in case it exists.
     */
    where: PagamentoWhereUniqueInput
    /**
     * In case the Pagamento found by the `where` argument doesn't exist, create a new Pagamento with this data.
     */
    create: XOR<PagamentoCreateInput, PagamentoUncheckedCreateInput>
    /**
     * In case the Pagamento was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PagamentoUpdateInput, PagamentoUncheckedUpdateInput>
  }

  /**
   * Pagamento delete
   */
  export type PagamentoDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pagamento
     */
    select?: PagamentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pagamento
     */
    omit?: PagamentoOmit<ExtArgs> | null
    /**
     * Filter which Pagamento to delete.
     */
    where: PagamentoWhereUniqueInput
  }

  /**
   * Pagamento deleteMany
   */
  export type PagamentoDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Pagamentos to delete
     */
    where?: PagamentoWhereInput
    /**
     * Limit how many Pagamentos to delete.
     */
    limit?: number
  }

  /**
   * Pagamento without action
   */
  export type PagamentoDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Pagamento
     */
    select?: PagamentoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Pagamento
     */
    omit?: PagamentoOmit<ExtArgs> | null
  }


  /**
   * Model AuditLog
   */

  export type AggregateAuditLog = {
    _count: AuditLogCountAggregateOutputType | null
    _avg: AuditLogAvgAggregateOutputType | null
    _sum: AuditLogSumAggregateOutputType | null
    _min: AuditLogMinAggregateOutputType | null
    _max: AuditLogMaxAggregateOutputType | null
  }

  export type AuditLogAvgAggregateOutputType = {
    id: number | null
  }

  export type AuditLogSumAggregateOutputType = {
    id: number | null
  }

  export type AuditLogMinAggregateOutputType = {
    id: number | null
    dataHora: Date | null
    usuario: string | null
    acao: string | null
    detalhes: string | null
  }

  export type AuditLogMaxAggregateOutputType = {
    id: number | null
    dataHora: Date | null
    usuario: string | null
    acao: string | null
    detalhes: string | null
  }

  export type AuditLogCountAggregateOutputType = {
    id: number
    dataHora: number
    usuario: number
    acao: number
    detalhes: number
    _all: number
  }


  export type AuditLogAvgAggregateInputType = {
    id?: true
  }

  export type AuditLogSumAggregateInputType = {
    id?: true
  }

  export type AuditLogMinAggregateInputType = {
    id?: true
    dataHora?: true
    usuario?: true
    acao?: true
    detalhes?: true
  }

  export type AuditLogMaxAggregateInputType = {
    id?: true
    dataHora?: true
    usuario?: true
    acao?: true
    detalhes?: true
  }

  export type AuditLogCountAggregateInputType = {
    id?: true
    dataHora?: true
    usuario?: true
    acao?: true
    detalhes?: true
    _all?: true
  }

  export type AuditLogAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AuditLog to aggregate.
     */
    where?: AuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditLogs to fetch.
     */
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AuditLogs
    **/
    _count?: true | AuditLogCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: AuditLogAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: AuditLogSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AuditLogMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AuditLogMaxAggregateInputType
  }

  export type GetAuditLogAggregateType<T extends AuditLogAggregateArgs> = {
        [P in keyof T & keyof AggregateAuditLog]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAuditLog[P]>
      : GetScalarType<T[P], AggregateAuditLog[P]>
  }




  export type AuditLogGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AuditLogWhereInput
    orderBy?: AuditLogOrderByWithAggregationInput | AuditLogOrderByWithAggregationInput[]
    by: AuditLogScalarFieldEnum[] | AuditLogScalarFieldEnum
    having?: AuditLogScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AuditLogCountAggregateInputType | true
    _avg?: AuditLogAvgAggregateInputType
    _sum?: AuditLogSumAggregateInputType
    _min?: AuditLogMinAggregateInputType
    _max?: AuditLogMaxAggregateInputType
  }

  export type AuditLogGroupByOutputType = {
    id: number
    dataHora: Date
    usuario: string | null
    acao: string | null
    detalhes: string | null
    _count: AuditLogCountAggregateOutputType | null
    _avg: AuditLogAvgAggregateOutputType | null
    _sum: AuditLogSumAggregateOutputType | null
    _min: AuditLogMinAggregateOutputType | null
    _max: AuditLogMaxAggregateOutputType | null
  }

  type GetAuditLogGroupByPayload<T extends AuditLogGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AuditLogGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AuditLogGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AuditLogGroupByOutputType[P]>
            : GetScalarType<T[P], AuditLogGroupByOutputType[P]>
        }
      >
    >


  export type AuditLogSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    dataHora?: boolean
    usuario?: boolean
    acao?: boolean
    detalhes?: boolean
  }, ExtArgs["result"]["auditLog"]>

  export type AuditLogSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    dataHora?: boolean
    usuario?: boolean
    acao?: boolean
    detalhes?: boolean
  }, ExtArgs["result"]["auditLog"]>

  export type AuditLogSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    dataHora?: boolean
    usuario?: boolean
    acao?: boolean
    detalhes?: boolean
  }, ExtArgs["result"]["auditLog"]>

  export type AuditLogSelectScalar = {
    id?: boolean
    dataHora?: boolean
    usuario?: boolean
    acao?: boolean
    detalhes?: boolean
  }

  export type AuditLogOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "dataHora" | "usuario" | "acao" | "detalhes", ExtArgs["result"]["auditLog"]>

  export type $AuditLogPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AuditLog"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      dataHora: Date
      usuario: string | null
      acao: string | null
      detalhes: string | null
    }, ExtArgs["result"]["auditLog"]>
    composites: {}
  }

  type AuditLogGetPayload<S extends boolean | null | undefined | AuditLogDefaultArgs> = $Result.GetResult<Prisma.$AuditLogPayload, S>

  type AuditLogCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AuditLogFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AuditLogCountAggregateInputType | true
    }

  export interface AuditLogDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AuditLog'], meta: { name: 'AuditLog' } }
    /**
     * Find zero or one AuditLog that matches the filter.
     * @param {AuditLogFindUniqueArgs} args - Arguments to find a AuditLog
     * @example
     * // Get one AuditLog
     * const auditLog = await prisma.auditLog.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AuditLogFindUniqueArgs>(args: SelectSubset<T, AuditLogFindUniqueArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AuditLog that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AuditLogFindUniqueOrThrowArgs} args - Arguments to find a AuditLog
     * @example
     * // Get one AuditLog
     * const auditLog = await prisma.auditLog.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AuditLogFindUniqueOrThrowArgs>(args: SelectSubset<T, AuditLogFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AuditLog that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogFindFirstArgs} args - Arguments to find a AuditLog
     * @example
     * // Get one AuditLog
     * const auditLog = await prisma.auditLog.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AuditLogFindFirstArgs>(args?: SelectSubset<T, AuditLogFindFirstArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AuditLog that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogFindFirstOrThrowArgs} args - Arguments to find a AuditLog
     * @example
     * // Get one AuditLog
     * const auditLog = await prisma.auditLog.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AuditLogFindFirstOrThrowArgs>(args?: SelectSubset<T, AuditLogFindFirstOrThrowArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AuditLogs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AuditLogs
     * const auditLogs = await prisma.auditLog.findMany()
     * 
     * // Get first 10 AuditLogs
     * const auditLogs = await prisma.auditLog.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const auditLogWithIdOnly = await prisma.auditLog.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AuditLogFindManyArgs>(args?: SelectSubset<T, AuditLogFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AuditLog.
     * @param {AuditLogCreateArgs} args - Arguments to create a AuditLog.
     * @example
     * // Create one AuditLog
     * const AuditLog = await prisma.auditLog.create({
     *   data: {
     *     // ... data to create a AuditLog
     *   }
     * })
     * 
     */
    create<T extends AuditLogCreateArgs>(args: SelectSubset<T, AuditLogCreateArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AuditLogs.
     * @param {AuditLogCreateManyArgs} args - Arguments to create many AuditLogs.
     * @example
     * // Create many AuditLogs
     * const auditLog = await prisma.auditLog.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AuditLogCreateManyArgs>(args?: SelectSubset<T, AuditLogCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AuditLogs and returns the data saved in the database.
     * @param {AuditLogCreateManyAndReturnArgs} args - Arguments to create many AuditLogs.
     * @example
     * // Create many AuditLogs
     * const auditLog = await prisma.auditLog.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AuditLogs and only return the `id`
     * const auditLogWithIdOnly = await prisma.auditLog.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AuditLogCreateManyAndReturnArgs>(args?: SelectSubset<T, AuditLogCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AuditLog.
     * @param {AuditLogDeleteArgs} args - Arguments to delete one AuditLog.
     * @example
     * // Delete one AuditLog
     * const AuditLog = await prisma.auditLog.delete({
     *   where: {
     *     // ... filter to delete one AuditLog
     *   }
     * })
     * 
     */
    delete<T extends AuditLogDeleteArgs>(args: SelectSubset<T, AuditLogDeleteArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AuditLog.
     * @param {AuditLogUpdateArgs} args - Arguments to update one AuditLog.
     * @example
     * // Update one AuditLog
     * const auditLog = await prisma.auditLog.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AuditLogUpdateArgs>(args: SelectSubset<T, AuditLogUpdateArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AuditLogs.
     * @param {AuditLogDeleteManyArgs} args - Arguments to filter AuditLogs to delete.
     * @example
     * // Delete a few AuditLogs
     * const { count } = await prisma.auditLog.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AuditLogDeleteManyArgs>(args?: SelectSubset<T, AuditLogDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AuditLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AuditLogs
     * const auditLog = await prisma.auditLog.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AuditLogUpdateManyArgs>(args: SelectSubset<T, AuditLogUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AuditLogs and returns the data updated in the database.
     * @param {AuditLogUpdateManyAndReturnArgs} args - Arguments to update many AuditLogs.
     * @example
     * // Update many AuditLogs
     * const auditLog = await prisma.auditLog.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AuditLogs and only return the `id`
     * const auditLogWithIdOnly = await prisma.auditLog.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AuditLogUpdateManyAndReturnArgs>(args: SelectSubset<T, AuditLogUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AuditLog.
     * @param {AuditLogUpsertArgs} args - Arguments to update or create a AuditLog.
     * @example
     * // Update or create a AuditLog
     * const auditLog = await prisma.auditLog.upsert({
     *   create: {
     *     // ... data to create a AuditLog
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AuditLog we want to update
     *   }
     * })
     */
    upsert<T extends AuditLogUpsertArgs>(args: SelectSubset<T, AuditLogUpsertArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AuditLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogCountArgs} args - Arguments to filter AuditLogs to count.
     * @example
     * // Count the number of AuditLogs
     * const count = await prisma.auditLog.count({
     *   where: {
     *     // ... the filter for the AuditLogs we want to count
     *   }
     * })
    **/
    count<T extends AuditLogCountArgs>(
      args?: Subset<T, AuditLogCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AuditLogCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AuditLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AuditLogAggregateArgs>(args: Subset<T, AuditLogAggregateArgs>): Prisma.PrismaPromise<GetAuditLogAggregateType<T>>

    /**
     * Group by AuditLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AuditLogGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AuditLogGroupByArgs['orderBy'] }
        : { orderBy?: AuditLogGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AuditLogGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAuditLogGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AuditLog model
   */
  readonly fields: AuditLogFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AuditLog.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AuditLogClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AuditLog model
   */
  interface AuditLogFieldRefs {
    readonly id: FieldRef<"AuditLog", 'Int'>
    readonly dataHora: FieldRef<"AuditLog", 'DateTime'>
    readonly usuario: FieldRef<"AuditLog", 'String'>
    readonly acao: FieldRef<"AuditLog", 'String'>
    readonly detalhes: FieldRef<"AuditLog", 'String'>
  }
    

  // Custom InputTypes
  /**
   * AuditLog findUnique
   */
  export type AuditLogFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Filter, which AuditLog to fetch.
     */
    where: AuditLogWhereUniqueInput
  }

  /**
   * AuditLog findUniqueOrThrow
   */
  export type AuditLogFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Filter, which AuditLog to fetch.
     */
    where: AuditLogWhereUniqueInput
  }

  /**
   * AuditLog findFirst
   */
  export type AuditLogFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Filter, which AuditLog to fetch.
     */
    where?: AuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditLogs to fetch.
     */
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AuditLogs.
     */
    cursor?: AuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AuditLogs.
     */
    distinct?: AuditLogScalarFieldEnum | AuditLogScalarFieldEnum[]
  }

  /**
   * AuditLog findFirstOrThrow
   */
  export type AuditLogFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Filter, which AuditLog to fetch.
     */
    where?: AuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditLogs to fetch.
     */
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AuditLogs.
     */
    cursor?: AuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AuditLogs.
     */
    distinct?: AuditLogScalarFieldEnum | AuditLogScalarFieldEnum[]
  }

  /**
   * AuditLog findMany
   */
  export type AuditLogFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Filter, which AuditLogs to fetch.
     */
    where?: AuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditLogs to fetch.
     */
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AuditLogs.
     */
    cursor?: AuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditLogs.
     */
    skip?: number
    distinct?: AuditLogScalarFieldEnum | AuditLogScalarFieldEnum[]
  }

  /**
   * AuditLog create
   */
  export type AuditLogCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * The data needed to create a AuditLog.
     */
    data: XOR<AuditLogCreateInput, AuditLogUncheckedCreateInput>
  }

  /**
   * AuditLog createMany
   */
  export type AuditLogCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AuditLogs.
     */
    data: AuditLogCreateManyInput | AuditLogCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AuditLog createManyAndReturn
   */
  export type AuditLogCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * The data used to create many AuditLogs.
     */
    data: AuditLogCreateManyInput | AuditLogCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AuditLog update
   */
  export type AuditLogUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * The data needed to update a AuditLog.
     */
    data: XOR<AuditLogUpdateInput, AuditLogUncheckedUpdateInput>
    /**
     * Choose, which AuditLog to update.
     */
    where: AuditLogWhereUniqueInput
  }

  /**
   * AuditLog updateMany
   */
  export type AuditLogUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AuditLogs.
     */
    data: XOR<AuditLogUpdateManyMutationInput, AuditLogUncheckedUpdateManyInput>
    /**
     * Filter which AuditLogs to update
     */
    where?: AuditLogWhereInput
    /**
     * Limit how many AuditLogs to update.
     */
    limit?: number
  }

  /**
   * AuditLog updateManyAndReturn
   */
  export type AuditLogUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * The data used to update AuditLogs.
     */
    data: XOR<AuditLogUpdateManyMutationInput, AuditLogUncheckedUpdateManyInput>
    /**
     * Filter which AuditLogs to update
     */
    where?: AuditLogWhereInput
    /**
     * Limit how many AuditLogs to update.
     */
    limit?: number
  }

  /**
   * AuditLog upsert
   */
  export type AuditLogUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * The filter to search for the AuditLog to update in case it exists.
     */
    where: AuditLogWhereUniqueInput
    /**
     * In case the AuditLog found by the `where` argument doesn't exist, create a new AuditLog with this data.
     */
    create: XOR<AuditLogCreateInput, AuditLogUncheckedCreateInput>
    /**
     * In case the AuditLog was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AuditLogUpdateInput, AuditLogUncheckedUpdateInput>
  }

  /**
   * AuditLog delete
   */
  export type AuditLogDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Filter which AuditLog to delete.
     */
    where: AuditLogWhereUniqueInput
  }

  /**
   * AuditLog deleteMany
   */
  export type AuditLogDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AuditLogs to delete
     */
    where?: AuditLogWhereInput
    /**
     * Limit how many AuditLogs to delete.
     */
    limit?: number
  }

  /**
   * AuditLog without action
   */
  export type AuditLogDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
  }


  /**
   * Model Despesa
   */

  export type AggregateDespesa = {
    _count: DespesaCountAggregateOutputType | null
    _avg: DespesaAvgAggregateOutputType | null
    _sum: DespesaSumAggregateOutputType | null
    _min: DespesaMinAggregateOutputType | null
    _max: DespesaMaxAggregateOutputType | null
  }

  export type DespesaAvgAggregateOutputType = {
    id: number | null
    valor: number | null
  }

  export type DespesaSumAggregateOutputType = {
    id: number | null
    valor: number | null
  }

  export type DespesaMinAggregateOutputType = {
    id: number | null
    dataDespesa: Date | null
    descricao: string | null
    categoria: string | null
    valor: number | null
    tipo: string | null
  }

  export type DespesaMaxAggregateOutputType = {
    id: number | null
    dataDespesa: Date | null
    descricao: string | null
    categoria: string | null
    valor: number | null
    tipo: string | null
  }

  export type DespesaCountAggregateOutputType = {
    id: number
    dataDespesa: number
    descricao: number
    categoria: number
    valor: number
    tipo: number
    _all: number
  }


  export type DespesaAvgAggregateInputType = {
    id?: true
    valor?: true
  }

  export type DespesaSumAggregateInputType = {
    id?: true
    valor?: true
  }

  export type DespesaMinAggregateInputType = {
    id?: true
    dataDespesa?: true
    descricao?: true
    categoria?: true
    valor?: true
    tipo?: true
  }

  export type DespesaMaxAggregateInputType = {
    id?: true
    dataDespesa?: true
    descricao?: true
    categoria?: true
    valor?: true
    tipo?: true
  }

  export type DespesaCountAggregateInputType = {
    id?: true
    dataDespesa?: true
    descricao?: true
    categoria?: true
    valor?: true
    tipo?: true
    _all?: true
  }

  export type DespesaAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Despesa to aggregate.
     */
    where?: DespesaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Despesas to fetch.
     */
    orderBy?: DespesaOrderByWithRelationInput | DespesaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: DespesaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Despesas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Despesas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Despesas
    **/
    _count?: true | DespesaCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: DespesaAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: DespesaSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: DespesaMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: DespesaMaxAggregateInputType
  }

  export type GetDespesaAggregateType<T extends DespesaAggregateArgs> = {
        [P in keyof T & keyof AggregateDespesa]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateDespesa[P]>
      : GetScalarType<T[P], AggregateDespesa[P]>
  }




  export type DespesaGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: DespesaWhereInput
    orderBy?: DespesaOrderByWithAggregationInput | DespesaOrderByWithAggregationInput[]
    by: DespesaScalarFieldEnum[] | DespesaScalarFieldEnum
    having?: DespesaScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: DespesaCountAggregateInputType | true
    _avg?: DespesaAvgAggregateInputType
    _sum?: DespesaSumAggregateInputType
    _min?: DespesaMinAggregateInputType
    _max?: DespesaMaxAggregateInputType
  }

  export type DespesaGroupByOutputType = {
    id: number
    dataDespesa: Date
    descricao: string | null
    categoria: string | null
    valor: number | null
    tipo: string | null
    _count: DespesaCountAggregateOutputType | null
    _avg: DespesaAvgAggregateOutputType | null
    _sum: DespesaSumAggregateOutputType | null
    _min: DespesaMinAggregateOutputType | null
    _max: DespesaMaxAggregateOutputType | null
  }

  type GetDespesaGroupByPayload<T extends DespesaGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<DespesaGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof DespesaGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], DespesaGroupByOutputType[P]>
            : GetScalarType<T[P], DespesaGroupByOutputType[P]>
        }
      >
    >


  export type DespesaSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    dataDespesa?: boolean
    descricao?: boolean
    categoria?: boolean
    valor?: boolean
    tipo?: boolean
  }, ExtArgs["result"]["despesa"]>

  export type DespesaSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    dataDespesa?: boolean
    descricao?: boolean
    categoria?: boolean
    valor?: boolean
    tipo?: boolean
  }, ExtArgs["result"]["despesa"]>

  export type DespesaSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    dataDespesa?: boolean
    descricao?: boolean
    categoria?: boolean
    valor?: boolean
    tipo?: boolean
  }, ExtArgs["result"]["despesa"]>

  export type DespesaSelectScalar = {
    id?: boolean
    dataDespesa?: boolean
    descricao?: boolean
    categoria?: boolean
    valor?: boolean
    tipo?: boolean
  }

  export type DespesaOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "dataDespesa" | "descricao" | "categoria" | "valor" | "tipo", ExtArgs["result"]["despesa"]>

  export type $DespesaPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Despesa"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      dataDespesa: Date
      descricao: string | null
      categoria: string | null
      valor: number | null
      tipo: string | null
    }, ExtArgs["result"]["despesa"]>
    composites: {}
  }

  type DespesaGetPayload<S extends boolean | null | undefined | DespesaDefaultArgs> = $Result.GetResult<Prisma.$DespesaPayload, S>

  type DespesaCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<DespesaFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: DespesaCountAggregateInputType | true
    }

  export interface DespesaDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Despesa'], meta: { name: 'Despesa' } }
    /**
     * Find zero or one Despesa that matches the filter.
     * @param {DespesaFindUniqueArgs} args - Arguments to find a Despesa
     * @example
     * // Get one Despesa
     * const despesa = await prisma.despesa.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends DespesaFindUniqueArgs>(args: SelectSubset<T, DespesaFindUniqueArgs<ExtArgs>>): Prisma__DespesaClient<$Result.GetResult<Prisma.$DespesaPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Despesa that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {DespesaFindUniqueOrThrowArgs} args - Arguments to find a Despesa
     * @example
     * // Get one Despesa
     * const despesa = await prisma.despesa.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends DespesaFindUniqueOrThrowArgs>(args: SelectSubset<T, DespesaFindUniqueOrThrowArgs<ExtArgs>>): Prisma__DespesaClient<$Result.GetResult<Prisma.$DespesaPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Despesa that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DespesaFindFirstArgs} args - Arguments to find a Despesa
     * @example
     * // Get one Despesa
     * const despesa = await prisma.despesa.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends DespesaFindFirstArgs>(args?: SelectSubset<T, DespesaFindFirstArgs<ExtArgs>>): Prisma__DespesaClient<$Result.GetResult<Prisma.$DespesaPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Despesa that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DespesaFindFirstOrThrowArgs} args - Arguments to find a Despesa
     * @example
     * // Get one Despesa
     * const despesa = await prisma.despesa.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends DespesaFindFirstOrThrowArgs>(args?: SelectSubset<T, DespesaFindFirstOrThrowArgs<ExtArgs>>): Prisma__DespesaClient<$Result.GetResult<Prisma.$DespesaPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Despesas that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DespesaFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Despesas
     * const despesas = await prisma.despesa.findMany()
     * 
     * // Get first 10 Despesas
     * const despesas = await prisma.despesa.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const despesaWithIdOnly = await prisma.despesa.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends DespesaFindManyArgs>(args?: SelectSubset<T, DespesaFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DespesaPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Despesa.
     * @param {DespesaCreateArgs} args - Arguments to create a Despesa.
     * @example
     * // Create one Despesa
     * const Despesa = await prisma.despesa.create({
     *   data: {
     *     // ... data to create a Despesa
     *   }
     * })
     * 
     */
    create<T extends DespesaCreateArgs>(args: SelectSubset<T, DespesaCreateArgs<ExtArgs>>): Prisma__DespesaClient<$Result.GetResult<Prisma.$DespesaPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Despesas.
     * @param {DespesaCreateManyArgs} args - Arguments to create many Despesas.
     * @example
     * // Create many Despesas
     * const despesa = await prisma.despesa.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends DespesaCreateManyArgs>(args?: SelectSubset<T, DespesaCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Despesas and returns the data saved in the database.
     * @param {DespesaCreateManyAndReturnArgs} args - Arguments to create many Despesas.
     * @example
     * // Create many Despesas
     * const despesa = await prisma.despesa.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Despesas and only return the `id`
     * const despesaWithIdOnly = await prisma.despesa.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends DespesaCreateManyAndReturnArgs>(args?: SelectSubset<T, DespesaCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DespesaPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Despesa.
     * @param {DespesaDeleteArgs} args - Arguments to delete one Despesa.
     * @example
     * // Delete one Despesa
     * const Despesa = await prisma.despesa.delete({
     *   where: {
     *     // ... filter to delete one Despesa
     *   }
     * })
     * 
     */
    delete<T extends DespesaDeleteArgs>(args: SelectSubset<T, DespesaDeleteArgs<ExtArgs>>): Prisma__DespesaClient<$Result.GetResult<Prisma.$DespesaPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Despesa.
     * @param {DespesaUpdateArgs} args - Arguments to update one Despesa.
     * @example
     * // Update one Despesa
     * const despesa = await prisma.despesa.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends DespesaUpdateArgs>(args: SelectSubset<T, DespesaUpdateArgs<ExtArgs>>): Prisma__DespesaClient<$Result.GetResult<Prisma.$DespesaPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Despesas.
     * @param {DespesaDeleteManyArgs} args - Arguments to filter Despesas to delete.
     * @example
     * // Delete a few Despesas
     * const { count } = await prisma.despesa.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends DespesaDeleteManyArgs>(args?: SelectSubset<T, DespesaDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Despesas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DespesaUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Despesas
     * const despesa = await prisma.despesa.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends DespesaUpdateManyArgs>(args: SelectSubset<T, DespesaUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Despesas and returns the data updated in the database.
     * @param {DespesaUpdateManyAndReturnArgs} args - Arguments to update many Despesas.
     * @example
     * // Update many Despesas
     * const despesa = await prisma.despesa.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Despesas and only return the `id`
     * const despesaWithIdOnly = await prisma.despesa.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends DespesaUpdateManyAndReturnArgs>(args: SelectSubset<T, DespesaUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DespesaPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Despesa.
     * @param {DespesaUpsertArgs} args - Arguments to update or create a Despesa.
     * @example
     * // Update or create a Despesa
     * const despesa = await prisma.despesa.upsert({
     *   create: {
     *     // ... data to create a Despesa
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Despesa we want to update
     *   }
     * })
     */
    upsert<T extends DespesaUpsertArgs>(args: SelectSubset<T, DespesaUpsertArgs<ExtArgs>>): Prisma__DespesaClient<$Result.GetResult<Prisma.$DespesaPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Despesas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DespesaCountArgs} args - Arguments to filter Despesas to count.
     * @example
     * // Count the number of Despesas
     * const count = await prisma.despesa.count({
     *   where: {
     *     // ... the filter for the Despesas we want to count
     *   }
     * })
    **/
    count<T extends DespesaCountArgs>(
      args?: Subset<T, DespesaCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], DespesaCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Despesa.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DespesaAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends DespesaAggregateArgs>(args: Subset<T, DespesaAggregateArgs>): Prisma.PrismaPromise<GetDespesaAggregateType<T>>

    /**
     * Group by Despesa.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DespesaGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends DespesaGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: DespesaGroupByArgs['orderBy'] }
        : { orderBy?: DespesaGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, DespesaGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetDespesaGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Despesa model
   */
  readonly fields: DespesaFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Despesa.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__DespesaClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Despesa model
   */
  interface DespesaFieldRefs {
    readonly id: FieldRef<"Despesa", 'Int'>
    readonly dataDespesa: FieldRef<"Despesa", 'DateTime'>
    readonly descricao: FieldRef<"Despesa", 'String'>
    readonly categoria: FieldRef<"Despesa", 'String'>
    readonly valor: FieldRef<"Despesa", 'Float'>
    readonly tipo: FieldRef<"Despesa", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Despesa findUnique
   */
  export type DespesaFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Despesa
     */
    select?: DespesaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Despesa
     */
    omit?: DespesaOmit<ExtArgs> | null
    /**
     * Filter, which Despesa to fetch.
     */
    where: DespesaWhereUniqueInput
  }

  /**
   * Despesa findUniqueOrThrow
   */
  export type DespesaFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Despesa
     */
    select?: DespesaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Despesa
     */
    omit?: DespesaOmit<ExtArgs> | null
    /**
     * Filter, which Despesa to fetch.
     */
    where: DespesaWhereUniqueInput
  }

  /**
   * Despesa findFirst
   */
  export type DespesaFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Despesa
     */
    select?: DespesaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Despesa
     */
    omit?: DespesaOmit<ExtArgs> | null
    /**
     * Filter, which Despesa to fetch.
     */
    where?: DespesaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Despesas to fetch.
     */
    orderBy?: DespesaOrderByWithRelationInput | DespesaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Despesas.
     */
    cursor?: DespesaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Despesas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Despesas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Despesas.
     */
    distinct?: DespesaScalarFieldEnum | DespesaScalarFieldEnum[]
  }

  /**
   * Despesa findFirstOrThrow
   */
  export type DespesaFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Despesa
     */
    select?: DespesaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Despesa
     */
    omit?: DespesaOmit<ExtArgs> | null
    /**
     * Filter, which Despesa to fetch.
     */
    where?: DespesaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Despesas to fetch.
     */
    orderBy?: DespesaOrderByWithRelationInput | DespesaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Despesas.
     */
    cursor?: DespesaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Despesas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Despesas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Despesas.
     */
    distinct?: DespesaScalarFieldEnum | DespesaScalarFieldEnum[]
  }

  /**
   * Despesa findMany
   */
  export type DespesaFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Despesa
     */
    select?: DespesaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Despesa
     */
    omit?: DespesaOmit<ExtArgs> | null
    /**
     * Filter, which Despesas to fetch.
     */
    where?: DespesaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Despesas to fetch.
     */
    orderBy?: DespesaOrderByWithRelationInput | DespesaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Despesas.
     */
    cursor?: DespesaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Despesas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Despesas.
     */
    skip?: number
    distinct?: DespesaScalarFieldEnum | DespesaScalarFieldEnum[]
  }

  /**
   * Despesa create
   */
  export type DespesaCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Despesa
     */
    select?: DespesaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Despesa
     */
    omit?: DespesaOmit<ExtArgs> | null
    /**
     * The data needed to create a Despesa.
     */
    data: XOR<DespesaCreateInput, DespesaUncheckedCreateInput>
  }

  /**
   * Despesa createMany
   */
  export type DespesaCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Despesas.
     */
    data: DespesaCreateManyInput | DespesaCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Despesa createManyAndReturn
   */
  export type DespesaCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Despesa
     */
    select?: DespesaSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Despesa
     */
    omit?: DespesaOmit<ExtArgs> | null
    /**
     * The data used to create many Despesas.
     */
    data: DespesaCreateManyInput | DespesaCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Despesa update
   */
  export type DespesaUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Despesa
     */
    select?: DespesaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Despesa
     */
    omit?: DespesaOmit<ExtArgs> | null
    /**
     * The data needed to update a Despesa.
     */
    data: XOR<DespesaUpdateInput, DespesaUncheckedUpdateInput>
    /**
     * Choose, which Despesa to update.
     */
    where: DespesaWhereUniqueInput
  }

  /**
   * Despesa updateMany
   */
  export type DespesaUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Despesas.
     */
    data: XOR<DespesaUpdateManyMutationInput, DespesaUncheckedUpdateManyInput>
    /**
     * Filter which Despesas to update
     */
    where?: DespesaWhereInput
    /**
     * Limit how many Despesas to update.
     */
    limit?: number
  }

  /**
   * Despesa updateManyAndReturn
   */
  export type DespesaUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Despesa
     */
    select?: DespesaSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Despesa
     */
    omit?: DespesaOmit<ExtArgs> | null
    /**
     * The data used to update Despesas.
     */
    data: XOR<DespesaUpdateManyMutationInput, DespesaUncheckedUpdateManyInput>
    /**
     * Filter which Despesas to update
     */
    where?: DespesaWhereInput
    /**
     * Limit how many Despesas to update.
     */
    limit?: number
  }

  /**
   * Despesa upsert
   */
  export type DespesaUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Despesa
     */
    select?: DespesaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Despesa
     */
    omit?: DespesaOmit<ExtArgs> | null
    /**
     * The filter to search for the Despesa to update in case it exists.
     */
    where: DespesaWhereUniqueInput
    /**
     * In case the Despesa found by the `where` argument doesn't exist, create a new Despesa with this data.
     */
    create: XOR<DespesaCreateInput, DespesaUncheckedCreateInput>
    /**
     * In case the Despesa was found with the provided `where` argument, update it with this data.
     */
    update: XOR<DespesaUpdateInput, DespesaUncheckedUpdateInput>
  }

  /**
   * Despesa delete
   */
  export type DespesaDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Despesa
     */
    select?: DespesaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Despesa
     */
    omit?: DespesaOmit<ExtArgs> | null
    /**
     * Filter which Despesa to delete.
     */
    where: DespesaWhereUniqueInput
  }

  /**
   * Despesa deleteMany
   */
  export type DespesaDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Despesas to delete
     */
    where?: DespesaWhereInput
    /**
     * Limit how many Despesas to delete.
     */
    limit?: number
  }

  /**
   * Despesa without action
   */
  export type DespesaDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Despesa
     */
    select?: DespesaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Despesa
     */
    omit?: DespesaOmit<ExtArgs> | null
  }


  /**
   * Model Aviso
   */

  export type AggregateAviso = {
    _count: AvisoCountAggregateOutputType | null
    _avg: AvisoAvgAggregateOutputType | null
    _sum: AvisoSumAggregateOutputType | null
    _min: AvisoMinAggregateOutputType | null
    _max: AvisoMaxAggregateOutputType | null
  }

  export type AvisoAvgAggregateOutputType = {
    id: number | null
    ativo: number | null
  }

  export type AvisoSumAggregateOutputType = {
    id: number | null
    ativo: number | null
  }

  export type AvisoMinAggregateOutputType = {
    id: number | null
    dataCriacao: Date | null
    mensagem: string | null
    ativo: number | null
  }

  export type AvisoMaxAggregateOutputType = {
    id: number | null
    dataCriacao: Date | null
    mensagem: string | null
    ativo: number | null
  }

  export type AvisoCountAggregateOutputType = {
    id: number
    dataCriacao: number
    mensagem: number
    ativo: number
    _all: number
  }


  export type AvisoAvgAggregateInputType = {
    id?: true
    ativo?: true
  }

  export type AvisoSumAggregateInputType = {
    id?: true
    ativo?: true
  }

  export type AvisoMinAggregateInputType = {
    id?: true
    dataCriacao?: true
    mensagem?: true
    ativo?: true
  }

  export type AvisoMaxAggregateInputType = {
    id?: true
    dataCriacao?: true
    mensagem?: true
    ativo?: true
  }

  export type AvisoCountAggregateInputType = {
    id?: true
    dataCriacao?: true
    mensagem?: true
    ativo?: true
    _all?: true
  }

  export type AvisoAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Aviso to aggregate.
     */
    where?: AvisoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Avisos to fetch.
     */
    orderBy?: AvisoOrderByWithRelationInput | AvisoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AvisoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Avisos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Avisos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Avisos
    **/
    _count?: true | AvisoCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: AvisoAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: AvisoSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AvisoMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AvisoMaxAggregateInputType
  }

  export type GetAvisoAggregateType<T extends AvisoAggregateArgs> = {
        [P in keyof T & keyof AggregateAviso]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAviso[P]>
      : GetScalarType<T[P], AggregateAviso[P]>
  }




  export type AvisoGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AvisoWhereInput
    orderBy?: AvisoOrderByWithAggregationInput | AvisoOrderByWithAggregationInput[]
    by: AvisoScalarFieldEnum[] | AvisoScalarFieldEnum
    having?: AvisoScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AvisoCountAggregateInputType | true
    _avg?: AvisoAvgAggregateInputType
    _sum?: AvisoSumAggregateInputType
    _min?: AvisoMinAggregateInputType
    _max?: AvisoMaxAggregateInputType
  }

  export type AvisoGroupByOutputType = {
    id: number
    dataCriacao: Date
    mensagem: string | null
    ativo: number | null
    _count: AvisoCountAggregateOutputType | null
    _avg: AvisoAvgAggregateOutputType | null
    _sum: AvisoSumAggregateOutputType | null
    _min: AvisoMinAggregateOutputType | null
    _max: AvisoMaxAggregateOutputType | null
  }

  type GetAvisoGroupByPayload<T extends AvisoGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AvisoGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AvisoGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AvisoGroupByOutputType[P]>
            : GetScalarType<T[P], AvisoGroupByOutputType[P]>
        }
      >
    >


  export type AvisoSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    dataCriacao?: boolean
    mensagem?: boolean
    ativo?: boolean
  }, ExtArgs["result"]["aviso"]>

  export type AvisoSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    dataCriacao?: boolean
    mensagem?: boolean
    ativo?: boolean
  }, ExtArgs["result"]["aviso"]>

  export type AvisoSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    dataCriacao?: boolean
    mensagem?: boolean
    ativo?: boolean
  }, ExtArgs["result"]["aviso"]>

  export type AvisoSelectScalar = {
    id?: boolean
    dataCriacao?: boolean
    mensagem?: boolean
    ativo?: boolean
  }

  export type AvisoOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "dataCriacao" | "mensagem" | "ativo", ExtArgs["result"]["aviso"]>

  export type $AvisoPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Aviso"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      dataCriacao: Date
      mensagem: string | null
      ativo: number | null
    }, ExtArgs["result"]["aviso"]>
    composites: {}
  }

  type AvisoGetPayload<S extends boolean | null | undefined | AvisoDefaultArgs> = $Result.GetResult<Prisma.$AvisoPayload, S>

  type AvisoCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AvisoFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AvisoCountAggregateInputType | true
    }

  export interface AvisoDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Aviso'], meta: { name: 'Aviso' } }
    /**
     * Find zero or one Aviso that matches the filter.
     * @param {AvisoFindUniqueArgs} args - Arguments to find a Aviso
     * @example
     * // Get one Aviso
     * const aviso = await prisma.aviso.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AvisoFindUniqueArgs>(args: SelectSubset<T, AvisoFindUniqueArgs<ExtArgs>>): Prisma__AvisoClient<$Result.GetResult<Prisma.$AvisoPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Aviso that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AvisoFindUniqueOrThrowArgs} args - Arguments to find a Aviso
     * @example
     * // Get one Aviso
     * const aviso = await prisma.aviso.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AvisoFindUniqueOrThrowArgs>(args: SelectSubset<T, AvisoFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AvisoClient<$Result.GetResult<Prisma.$AvisoPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Aviso that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AvisoFindFirstArgs} args - Arguments to find a Aviso
     * @example
     * // Get one Aviso
     * const aviso = await prisma.aviso.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AvisoFindFirstArgs>(args?: SelectSubset<T, AvisoFindFirstArgs<ExtArgs>>): Prisma__AvisoClient<$Result.GetResult<Prisma.$AvisoPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Aviso that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AvisoFindFirstOrThrowArgs} args - Arguments to find a Aviso
     * @example
     * // Get one Aviso
     * const aviso = await prisma.aviso.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AvisoFindFirstOrThrowArgs>(args?: SelectSubset<T, AvisoFindFirstOrThrowArgs<ExtArgs>>): Prisma__AvisoClient<$Result.GetResult<Prisma.$AvisoPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Avisos that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AvisoFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Avisos
     * const avisos = await prisma.aviso.findMany()
     * 
     * // Get first 10 Avisos
     * const avisos = await prisma.aviso.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const avisoWithIdOnly = await prisma.aviso.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AvisoFindManyArgs>(args?: SelectSubset<T, AvisoFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AvisoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Aviso.
     * @param {AvisoCreateArgs} args - Arguments to create a Aviso.
     * @example
     * // Create one Aviso
     * const Aviso = await prisma.aviso.create({
     *   data: {
     *     // ... data to create a Aviso
     *   }
     * })
     * 
     */
    create<T extends AvisoCreateArgs>(args: SelectSubset<T, AvisoCreateArgs<ExtArgs>>): Prisma__AvisoClient<$Result.GetResult<Prisma.$AvisoPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Avisos.
     * @param {AvisoCreateManyArgs} args - Arguments to create many Avisos.
     * @example
     * // Create many Avisos
     * const aviso = await prisma.aviso.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AvisoCreateManyArgs>(args?: SelectSubset<T, AvisoCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Avisos and returns the data saved in the database.
     * @param {AvisoCreateManyAndReturnArgs} args - Arguments to create many Avisos.
     * @example
     * // Create many Avisos
     * const aviso = await prisma.aviso.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Avisos and only return the `id`
     * const avisoWithIdOnly = await prisma.aviso.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AvisoCreateManyAndReturnArgs>(args?: SelectSubset<T, AvisoCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AvisoPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Aviso.
     * @param {AvisoDeleteArgs} args - Arguments to delete one Aviso.
     * @example
     * // Delete one Aviso
     * const Aviso = await prisma.aviso.delete({
     *   where: {
     *     // ... filter to delete one Aviso
     *   }
     * })
     * 
     */
    delete<T extends AvisoDeleteArgs>(args: SelectSubset<T, AvisoDeleteArgs<ExtArgs>>): Prisma__AvisoClient<$Result.GetResult<Prisma.$AvisoPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Aviso.
     * @param {AvisoUpdateArgs} args - Arguments to update one Aviso.
     * @example
     * // Update one Aviso
     * const aviso = await prisma.aviso.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AvisoUpdateArgs>(args: SelectSubset<T, AvisoUpdateArgs<ExtArgs>>): Prisma__AvisoClient<$Result.GetResult<Prisma.$AvisoPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Avisos.
     * @param {AvisoDeleteManyArgs} args - Arguments to filter Avisos to delete.
     * @example
     * // Delete a few Avisos
     * const { count } = await prisma.aviso.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AvisoDeleteManyArgs>(args?: SelectSubset<T, AvisoDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Avisos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AvisoUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Avisos
     * const aviso = await prisma.aviso.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AvisoUpdateManyArgs>(args: SelectSubset<T, AvisoUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Avisos and returns the data updated in the database.
     * @param {AvisoUpdateManyAndReturnArgs} args - Arguments to update many Avisos.
     * @example
     * // Update many Avisos
     * const aviso = await prisma.aviso.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Avisos and only return the `id`
     * const avisoWithIdOnly = await prisma.aviso.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AvisoUpdateManyAndReturnArgs>(args: SelectSubset<T, AvisoUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AvisoPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Aviso.
     * @param {AvisoUpsertArgs} args - Arguments to update or create a Aviso.
     * @example
     * // Update or create a Aviso
     * const aviso = await prisma.aviso.upsert({
     *   create: {
     *     // ... data to create a Aviso
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Aviso we want to update
     *   }
     * })
     */
    upsert<T extends AvisoUpsertArgs>(args: SelectSubset<T, AvisoUpsertArgs<ExtArgs>>): Prisma__AvisoClient<$Result.GetResult<Prisma.$AvisoPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Avisos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AvisoCountArgs} args - Arguments to filter Avisos to count.
     * @example
     * // Count the number of Avisos
     * const count = await prisma.aviso.count({
     *   where: {
     *     // ... the filter for the Avisos we want to count
     *   }
     * })
    **/
    count<T extends AvisoCountArgs>(
      args?: Subset<T, AvisoCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AvisoCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Aviso.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AvisoAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AvisoAggregateArgs>(args: Subset<T, AvisoAggregateArgs>): Prisma.PrismaPromise<GetAvisoAggregateType<T>>

    /**
     * Group by Aviso.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AvisoGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AvisoGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AvisoGroupByArgs['orderBy'] }
        : { orderBy?: AvisoGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AvisoGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAvisoGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Aviso model
   */
  readonly fields: AvisoFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Aviso.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AvisoClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Aviso model
   */
  interface AvisoFieldRefs {
    readonly id: FieldRef<"Aviso", 'Int'>
    readonly dataCriacao: FieldRef<"Aviso", 'DateTime'>
    readonly mensagem: FieldRef<"Aviso", 'String'>
    readonly ativo: FieldRef<"Aviso", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * Aviso findUnique
   */
  export type AvisoFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Aviso
     */
    select?: AvisoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Aviso
     */
    omit?: AvisoOmit<ExtArgs> | null
    /**
     * Filter, which Aviso to fetch.
     */
    where: AvisoWhereUniqueInput
  }

  /**
   * Aviso findUniqueOrThrow
   */
  export type AvisoFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Aviso
     */
    select?: AvisoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Aviso
     */
    omit?: AvisoOmit<ExtArgs> | null
    /**
     * Filter, which Aviso to fetch.
     */
    where: AvisoWhereUniqueInput
  }

  /**
   * Aviso findFirst
   */
  export type AvisoFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Aviso
     */
    select?: AvisoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Aviso
     */
    omit?: AvisoOmit<ExtArgs> | null
    /**
     * Filter, which Aviso to fetch.
     */
    where?: AvisoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Avisos to fetch.
     */
    orderBy?: AvisoOrderByWithRelationInput | AvisoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Avisos.
     */
    cursor?: AvisoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Avisos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Avisos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Avisos.
     */
    distinct?: AvisoScalarFieldEnum | AvisoScalarFieldEnum[]
  }

  /**
   * Aviso findFirstOrThrow
   */
  export type AvisoFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Aviso
     */
    select?: AvisoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Aviso
     */
    omit?: AvisoOmit<ExtArgs> | null
    /**
     * Filter, which Aviso to fetch.
     */
    where?: AvisoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Avisos to fetch.
     */
    orderBy?: AvisoOrderByWithRelationInput | AvisoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Avisos.
     */
    cursor?: AvisoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Avisos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Avisos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Avisos.
     */
    distinct?: AvisoScalarFieldEnum | AvisoScalarFieldEnum[]
  }

  /**
   * Aviso findMany
   */
  export type AvisoFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Aviso
     */
    select?: AvisoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Aviso
     */
    omit?: AvisoOmit<ExtArgs> | null
    /**
     * Filter, which Avisos to fetch.
     */
    where?: AvisoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Avisos to fetch.
     */
    orderBy?: AvisoOrderByWithRelationInput | AvisoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Avisos.
     */
    cursor?: AvisoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Avisos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Avisos.
     */
    skip?: number
    distinct?: AvisoScalarFieldEnum | AvisoScalarFieldEnum[]
  }

  /**
   * Aviso create
   */
  export type AvisoCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Aviso
     */
    select?: AvisoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Aviso
     */
    omit?: AvisoOmit<ExtArgs> | null
    /**
     * The data needed to create a Aviso.
     */
    data?: XOR<AvisoCreateInput, AvisoUncheckedCreateInput>
  }

  /**
   * Aviso createMany
   */
  export type AvisoCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Avisos.
     */
    data: AvisoCreateManyInput | AvisoCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Aviso createManyAndReturn
   */
  export type AvisoCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Aviso
     */
    select?: AvisoSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Aviso
     */
    omit?: AvisoOmit<ExtArgs> | null
    /**
     * The data used to create many Avisos.
     */
    data: AvisoCreateManyInput | AvisoCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Aviso update
   */
  export type AvisoUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Aviso
     */
    select?: AvisoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Aviso
     */
    omit?: AvisoOmit<ExtArgs> | null
    /**
     * The data needed to update a Aviso.
     */
    data: XOR<AvisoUpdateInput, AvisoUncheckedUpdateInput>
    /**
     * Choose, which Aviso to update.
     */
    where: AvisoWhereUniqueInput
  }

  /**
   * Aviso updateMany
   */
  export type AvisoUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Avisos.
     */
    data: XOR<AvisoUpdateManyMutationInput, AvisoUncheckedUpdateManyInput>
    /**
     * Filter which Avisos to update
     */
    where?: AvisoWhereInput
    /**
     * Limit how many Avisos to update.
     */
    limit?: number
  }

  /**
   * Aviso updateManyAndReturn
   */
  export type AvisoUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Aviso
     */
    select?: AvisoSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Aviso
     */
    omit?: AvisoOmit<ExtArgs> | null
    /**
     * The data used to update Avisos.
     */
    data: XOR<AvisoUpdateManyMutationInput, AvisoUncheckedUpdateManyInput>
    /**
     * Filter which Avisos to update
     */
    where?: AvisoWhereInput
    /**
     * Limit how many Avisos to update.
     */
    limit?: number
  }

  /**
   * Aviso upsert
   */
  export type AvisoUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Aviso
     */
    select?: AvisoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Aviso
     */
    omit?: AvisoOmit<ExtArgs> | null
    /**
     * The filter to search for the Aviso to update in case it exists.
     */
    where: AvisoWhereUniqueInput
    /**
     * In case the Aviso found by the `where` argument doesn't exist, create a new Aviso with this data.
     */
    create: XOR<AvisoCreateInput, AvisoUncheckedCreateInput>
    /**
     * In case the Aviso was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AvisoUpdateInput, AvisoUncheckedUpdateInput>
  }

  /**
   * Aviso delete
   */
  export type AvisoDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Aviso
     */
    select?: AvisoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Aviso
     */
    omit?: AvisoOmit<ExtArgs> | null
    /**
     * Filter which Aviso to delete.
     */
    where: AvisoWhereUniqueInput
  }

  /**
   * Aviso deleteMany
   */
  export type AvisoDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Avisos to delete
     */
    where?: AvisoWhereInput
    /**
     * Limit how many Avisos to delete.
     */
    limit?: number
  }

  /**
   * Aviso without action
   */
  export type AvisoDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Aviso
     */
    select?: AvisoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Aviso
     */
    omit?: AvisoOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const ClienteScalarFieldEnum: {
    id: 'id',
    nome: 'nome',
    renda: 'renda',
    empresa: 'empresa',
    matricula: 'matricula',
    telefone: 'telefone',
    cpf: 'cpf',
    cnpj: 'cnpj',
    tipo: 'tipo',
    dataNascimento: 'dataNascimento',
    cep: 'cep',
    endereco: 'endereco',
    email: 'email',
    asaasCustomerId: 'asaasCustomerId'
  };

  export type ClienteScalarFieldEnum = (typeof ClienteScalarFieldEnum)[keyof typeof ClienteScalarFieldEnum]


  export const ProdutoScalarFieldEnum: {
    id: 'id',
    nome: 'nome',
    custoPadrao: 'custoPadrao',
    marca: 'marca',
    categoria: 'categoria',
    ncm: 'ncm',
    imagem: 'imagem',
    fornecedorId: 'fornecedorId',
    qtdEstoque: 'qtdEstoque',
    valorVenda: 'valorVenda'
  };

  export type ProdutoScalarFieldEnum = (typeof ProdutoScalarFieldEnum)[keyof typeof ProdutoScalarFieldEnum]


  export const VendaScalarFieldEnum: {
    id: 'id',
    uuid: 'uuid',
    dataVenda: 'dataVenda',
    vendedor: 'vendedor',
    clienteId: 'clienteId',
    produtoNome: 'produtoNome',
    custoProduto: 'custoProduto',
    quantidade: 'quantidade',
    valorVenda: 'valorVenda',
    valorFrete: 'valorFrete',
    custoEnvio: 'custoEnvio',
    parcelas: 'parcelas',
    valorParcela: 'valorParcela',
    taxaFinanceiraValor: 'taxaFinanceiraValor',
    lucroLiquido: 'lucroLiquido',
    antecipada: 'antecipada',
    excedeuLimite: 'excedeuLimite',
    temNota: 'temNota',
    taxaNota: 'taxaNota',
    comprovantePdf: 'comprovantePdf',
    descontoEmFolha: 'descontoEmFolha',
    assinaturaToken: 'assinaturaToken',
    assinaturaStatus: 'assinaturaStatus',
    assinaturaEm: 'assinaturaEm',
    boleto: 'boleto',
    asaasPaymentId: 'asaasPaymentId',
    boletoUrl: 'boletoUrl'
  };

  export type VendaScalarFieldEnum = (typeof VendaScalarFieldEnum)[keyof typeof VendaScalarFieldEnum]


  export const DocumentoScalarFieldEnum: {
    id: 'id',
    vendaId: 'vendaId',
    tipo: 'tipo',
    mimeType: 'mimeType',
    conteudo: 'conteudo',
    tamanhoBytes: 'tamanhoBytes',
    criadoEm: 'criadoEm'
  };

  export type DocumentoScalarFieldEnum = (typeof DocumentoScalarFieldEnum)[keyof typeof DocumentoScalarFieldEnum]


  export const ItemVendaScalarFieldEnum: {
    id: 'id',
    vendaId: 'vendaId',
    produtoNome: 'produtoNome',
    custoProduto: 'custoProduto',
    valorVenda: 'valorVenda',
    quantidade: 'quantidade',
    subtotal: 'subtotal'
  };

  export type ItemVendaScalarFieldEnum = (typeof ItemVendaScalarFieldEnum)[keyof typeof ItemVendaScalarFieldEnum]


  export const ParcelaVencimentoScalarFieldEnum: {
    id: 'id',
    vendaId: 'vendaId',
    numeroParcela: 'numeroParcela',
    dataVencimento: 'dataVencimento',
    valorParcela: 'valorParcela',
    paga: 'paga',
    dataPagamento: 'dataPagamento'
  };

  export type ParcelaVencimentoScalarFieldEnum = (typeof ParcelaVencimentoScalarFieldEnum)[keyof typeof ParcelaVencimentoScalarFieldEnum]


  export const ConfigScalarFieldEnum: {
    id: 'id',
    modeloContrato: 'modeloContrato',
    modeloReciboVenda: 'modeloReciboVenda',
    logoPath: 'logoPath',
    openaiKey: 'openaiKey',
    geminiKey: 'geminiKey',
    evolutionApiUrl: 'evolutionApiUrl',
    evolutionApiKey: 'evolutionApiKey',
    evolutionInstance: 'evolutionInstance',
    whatsappAutoEnabled: 'whatsappAutoEnabled'
  };

  export type ConfigScalarFieldEnum = (typeof ConfigScalarFieldEnum)[keyof typeof ConfigScalarFieldEnum]


  export const UsuarioScalarFieldEnum: {
    id: 'id',
    username: 'username',
    password: 'password',
    role: 'role',
    nomeExibicao: 'nomeExibicao',
    email: 'email',
    telefone: 'telefone',
    dataNascimento: 'dataNascimento',
    endereco: 'endereco',
    cep: 'cep',
    metaMensal: 'metaMensal',
    comissaoPct: 'comissaoPct'
  };

  export type UsuarioScalarFieldEnum = (typeof UsuarioScalarFieldEnum)[keyof typeof UsuarioScalarFieldEnum]


  export const FornecedorScalarFieldEnum: {
    id: 'id',
    nome: 'nome',
    telefone: 'telefone'
  };

  export type FornecedorScalarFieldEnum = (typeof FornecedorScalarFieldEnum)[keyof typeof FornecedorScalarFieldEnum]


  export const EmpresaParceiraScalarFieldEnum: {
    id: 'id',
    nome: 'nome',
    responsavelRh: 'responsavelRh',
    telefoneRh: 'telefoneRh',
    emailRh: 'emailRh'
  };

  export type EmpresaParceiraScalarFieldEnum = (typeof EmpresaParceiraScalarFieldEnum)[keyof typeof EmpresaParceiraScalarFieldEnum]


  export const PagamentoScalarFieldEnum: {
    id: 'id',
    dataPagamento: 'dataPagamento',
    vendedor: 'vendedor',
    valor: 'valor',
    obs: 'obs'
  };

  export type PagamentoScalarFieldEnum = (typeof PagamentoScalarFieldEnum)[keyof typeof PagamentoScalarFieldEnum]


  export const AuditLogScalarFieldEnum: {
    id: 'id',
    dataHora: 'dataHora',
    usuario: 'usuario',
    acao: 'acao',
    detalhes: 'detalhes'
  };

  export type AuditLogScalarFieldEnum = (typeof AuditLogScalarFieldEnum)[keyof typeof AuditLogScalarFieldEnum]


  export const DespesaScalarFieldEnum: {
    id: 'id',
    dataDespesa: 'dataDespesa',
    descricao: 'descricao',
    categoria: 'categoria',
    valor: 'valor',
    tipo: 'tipo'
  };

  export type DespesaScalarFieldEnum = (typeof DespesaScalarFieldEnum)[keyof typeof DespesaScalarFieldEnum]


  export const AvisoScalarFieldEnum: {
    id: 'id',
    dataCriacao: 'dataCriacao',
    mensagem: 'mensagem',
    ativo: 'ativo'
  };

  export type AvisoScalarFieldEnum = (typeof AvisoScalarFieldEnum)[keyof typeof AvisoScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'Bytes'
   */
  export type BytesFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Bytes'>
    


  /**
   * Reference to a field of type 'Bytes[]'
   */
  export type ListBytesFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Bytes[]'>
    
  /**
   * Deep Input Types
   */


  export type ClienteWhereInput = {
    AND?: ClienteWhereInput | ClienteWhereInput[]
    OR?: ClienteWhereInput[]
    NOT?: ClienteWhereInput | ClienteWhereInput[]
    id?: IntFilter<"Cliente"> | number
    nome?: StringFilter<"Cliente"> | string
    renda?: FloatNullableFilter<"Cliente"> | number | null
    empresa?: StringNullableFilter<"Cliente"> | string | null
    matricula?: StringNullableFilter<"Cliente"> | string | null
    telefone?: StringNullableFilter<"Cliente"> | string | null
    cpf?: StringNullableFilter<"Cliente"> | string | null
    cnpj?: StringNullableFilter<"Cliente"> | string | null
    tipo?: StringNullableFilter<"Cliente"> | string | null
    dataNascimento?: DateTimeNullableFilter<"Cliente"> | Date | string | null
    cep?: StringNullableFilter<"Cliente"> | string | null
    endereco?: StringNullableFilter<"Cliente"> | string | null
    email?: StringNullableFilter<"Cliente"> | string | null
    asaasCustomerId?: StringNullableFilter<"Cliente"> | string | null
    vendas?: VendaListRelationFilter
  }

  export type ClienteOrderByWithRelationInput = {
    id?: SortOrder
    nome?: SortOrder
    renda?: SortOrderInput | SortOrder
    empresa?: SortOrderInput | SortOrder
    matricula?: SortOrderInput | SortOrder
    telefone?: SortOrderInput | SortOrder
    cpf?: SortOrderInput | SortOrder
    cnpj?: SortOrderInput | SortOrder
    tipo?: SortOrderInput | SortOrder
    dataNascimento?: SortOrderInput | SortOrder
    cep?: SortOrderInput | SortOrder
    endereco?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    asaasCustomerId?: SortOrderInput | SortOrder
    vendas?: VendaOrderByRelationAggregateInput
  }

  export type ClienteWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    nome?: string
    AND?: ClienteWhereInput | ClienteWhereInput[]
    OR?: ClienteWhereInput[]
    NOT?: ClienteWhereInput | ClienteWhereInput[]
    renda?: FloatNullableFilter<"Cliente"> | number | null
    empresa?: StringNullableFilter<"Cliente"> | string | null
    matricula?: StringNullableFilter<"Cliente"> | string | null
    telefone?: StringNullableFilter<"Cliente"> | string | null
    cpf?: StringNullableFilter<"Cliente"> | string | null
    cnpj?: StringNullableFilter<"Cliente"> | string | null
    tipo?: StringNullableFilter<"Cliente"> | string | null
    dataNascimento?: DateTimeNullableFilter<"Cliente"> | Date | string | null
    cep?: StringNullableFilter<"Cliente"> | string | null
    endereco?: StringNullableFilter<"Cliente"> | string | null
    email?: StringNullableFilter<"Cliente"> | string | null
    asaasCustomerId?: StringNullableFilter<"Cliente"> | string | null
    vendas?: VendaListRelationFilter
  }, "id" | "nome">

  export type ClienteOrderByWithAggregationInput = {
    id?: SortOrder
    nome?: SortOrder
    renda?: SortOrderInput | SortOrder
    empresa?: SortOrderInput | SortOrder
    matricula?: SortOrderInput | SortOrder
    telefone?: SortOrderInput | SortOrder
    cpf?: SortOrderInput | SortOrder
    cnpj?: SortOrderInput | SortOrder
    tipo?: SortOrderInput | SortOrder
    dataNascimento?: SortOrderInput | SortOrder
    cep?: SortOrderInput | SortOrder
    endereco?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    asaasCustomerId?: SortOrderInput | SortOrder
    _count?: ClienteCountOrderByAggregateInput
    _avg?: ClienteAvgOrderByAggregateInput
    _max?: ClienteMaxOrderByAggregateInput
    _min?: ClienteMinOrderByAggregateInput
    _sum?: ClienteSumOrderByAggregateInput
  }

  export type ClienteScalarWhereWithAggregatesInput = {
    AND?: ClienteScalarWhereWithAggregatesInput | ClienteScalarWhereWithAggregatesInput[]
    OR?: ClienteScalarWhereWithAggregatesInput[]
    NOT?: ClienteScalarWhereWithAggregatesInput | ClienteScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Cliente"> | number
    nome?: StringWithAggregatesFilter<"Cliente"> | string
    renda?: FloatNullableWithAggregatesFilter<"Cliente"> | number | null
    empresa?: StringNullableWithAggregatesFilter<"Cliente"> | string | null
    matricula?: StringNullableWithAggregatesFilter<"Cliente"> | string | null
    telefone?: StringNullableWithAggregatesFilter<"Cliente"> | string | null
    cpf?: StringNullableWithAggregatesFilter<"Cliente"> | string | null
    cnpj?: StringNullableWithAggregatesFilter<"Cliente"> | string | null
    tipo?: StringNullableWithAggregatesFilter<"Cliente"> | string | null
    dataNascimento?: DateTimeNullableWithAggregatesFilter<"Cliente"> | Date | string | null
    cep?: StringNullableWithAggregatesFilter<"Cliente"> | string | null
    endereco?: StringNullableWithAggregatesFilter<"Cliente"> | string | null
    email?: StringNullableWithAggregatesFilter<"Cliente"> | string | null
    asaasCustomerId?: StringNullableWithAggregatesFilter<"Cliente"> | string | null
  }

  export type ProdutoWhereInput = {
    AND?: ProdutoWhereInput | ProdutoWhereInput[]
    OR?: ProdutoWhereInput[]
    NOT?: ProdutoWhereInput | ProdutoWhereInput[]
    id?: IntFilter<"Produto"> | number
    nome?: StringFilter<"Produto"> | string
    custoPadrao?: FloatNullableFilter<"Produto"> | number | null
    marca?: StringNullableFilter<"Produto"> | string | null
    categoria?: StringNullableFilter<"Produto"> | string | null
    ncm?: StringNullableFilter<"Produto"> | string | null
    imagem?: StringNullableFilter<"Produto"> | string | null
    fornecedorId?: IntNullableFilter<"Produto"> | number | null
    qtdEstoque?: IntNullableFilter<"Produto"> | number | null
    valorVenda?: FloatNullableFilter<"Produto"> | number | null
    fornecedor?: XOR<FornecedorNullableScalarRelationFilter, FornecedorWhereInput> | null
  }

  export type ProdutoOrderByWithRelationInput = {
    id?: SortOrder
    nome?: SortOrder
    custoPadrao?: SortOrderInput | SortOrder
    marca?: SortOrderInput | SortOrder
    categoria?: SortOrderInput | SortOrder
    ncm?: SortOrderInput | SortOrder
    imagem?: SortOrderInput | SortOrder
    fornecedorId?: SortOrderInput | SortOrder
    qtdEstoque?: SortOrderInput | SortOrder
    valorVenda?: SortOrderInput | SortOrder
    fornecedor?: FornecedorOrderByWithRelationInput
  }

  export type ProdutoWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    nome?: string
    AND?: ProdutoWhereInput | ProdutoWhereInput[]
    OR?: ProdutoWhereInput[]
    NOT?: ProdutoWhereInput | ProdutoWhereInput[]
    custoPadrao?: FloatNullableFilter<"Produto"> | number | null
    marca?: StringNullableFilter<"Produto"> | string | null
    categoria?: StringNullableFilter<"Produto"> | string | null
    ncm?: StringNullableFilter<"Produto"> | string | null
    imagem?: StringNullableFilter<"Produto"> | string | null
    fornecedorId?: IntNullableFilter<"Produto"> | number | null
    qtdEstoque?: IntNullableFilter<"Produto"> | number | null
    valorVenda?: FloatNullableFilter<"Produto"> | number | null
    fornecedor?: XOR<FornecedorNullableScalarRelationFilter, FornecedorWhereInput> | null
  }, "id" | "nome">

  export type ProdutoOrderByWithAggregationInput = {
    id?: SortOrder
    nome?: SortOrder
    custoPadrao?: SortOrderInput | SortOrder
    marca?: SortOrderInput | SortOrder
    categoria?: SortOrderInput | SortOrder
    ncm?: SortOrderInput | SortOrder
    imagem?: SortOrderInput | SortOrder
    fornecedorId?: SortOrderInput | SortOrder
    qtdEstoque?: SortOrderInput | SortOrder
    valorVenda?: SortOrderInput | SortOrder
    _count?: ProdutoCountOrderByAggregateInput
    _avg?: ProdutoAvgOrderByAggregateInput
    _max?: ProdutoMaxOrderByAggregateInput
    _min?: ProdutoMinOrderByAggregateInput
    _sum?: ProdutoSumOrderByAggregateInput
  }

  export type ProdutoScalarWhereWithAggregatesInput = {
    AND?: ProdutoScalarWhereWithAggregatesInput | ProdutoScalarWhereWithAggregatesInput[]
    OR?: ProdutoScalarWhereWithAggregatesInput[]
    NOT?: ProdutoScalarWhereWithAggregatesInput | ProdutoScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Produto"> | number
    nome?: StringWithAggregatesFilter<"Produto"> | string
    custoPadrao?: FloatNullableWithAggregatesFilter<"Produto"> | number | null
    marca?: StringNullableWithAggregatesFilter<"Produto"> | string | null
    categoria?: StringNullableWithAggregatesFilter<"Produto"> | string | null
    ncm?: StringNullableWithAggregatesFilter<"Produto"> | string | null
    imagem?: StringNullableWithAggregatesFilter<"Produto"> | string | null
    fornecedorId?: IntNullableWithAggregatesFilter<"Produto"> | number | null
    qtdEstoque?: IntNullableWithAggregatesFilter<"Produto"> | number | null
    valorVenda?: FloatNullableWithAggregatesFilter<"Produto"> | number | null
  }

  export type VendaWhereInput = {
    AND?: VendaWhereInput | VendaWhereInput[]
    OR?: VendaWhereInput[]
    NOT?: VendaWhereInput | VendaWhereInput[]
    id?: IntFilter<"Venda"> | number
    uuid?: UuidNullableFilter<"Venda"> | string | null
    dataVenda?: DateTimeFilter<"Venda"> | Date | string
    vendedor?: StringNullableFilter<"Venda"> | string | null
    clienteId?: IntNullableFilter<"Venda"> | number | null
    produtoNome?: StringNullableFilter<"Venda"> | string | null
    custoProduto?: FloatNullableFilter<"Venda"> | number | null
    quantidade?: IntNullableFilter<"Venda"> | number | null
    valorVenda?: FloatNullableFilter<"Venda"> | number | null
    valorFrete?: FloatNullableFilter<"Venda"> | number | null
    custoEnvio?: FloatNullableFilter<"Venda"> | number | null
    parcelas?: IntNullableFilter<"Venda"> | number | null
    valorParcela?: FloatNullableFilter<"Venda"> | number | null
    taxaFinanceiraValor?: FloatNullableFilter<"Venda"> | number | null
    lucroLiquido?: FloatNullableFilter<"Venda"> | number | null
    antecipada?: IntNullableFilter<"Venda"> | number | null
    excedeuLimite?: IntNullableFilter<"Venda"> | number | null
    temNota?: BoolFilter<"Venda"> | boolean
    taxaNota?: FloatNullableFilter<"Venda"> | number | null
    comprovantePdf?: StringNullableFilter<"Venda"> | string | null
    descontoEmFolha?: BoolFilter<"Venda"> | boolean
    assinaturaToken?: StringNullableFilter<"Venda"> | string | null
    assinaturaStatus?: StringNullableFilter<"Venda"> | string | null
    assinaturaEm?: DateTimeNullableFilter<"Venda"> | Date | string | null
    boleto?: BoolFilter<"Venda"> | boolean
    asaasPaymentId?: StringNullableFilter<"Venda"> | string | null
    boletoUrl?: StringNullableFilter<"Venda"> | string | null
    cliente?: XOR<ClienteNullableScalarRelationFilter, ClienteWhereInput> | null
    itens?: ItemVendaListRelationFilter
    parcelasVencimento?: ParcelaVencimentoListRelationFilter
    documentos?: DocumentoListRelationFilter
  }

  export type VendaOrderByWithRelationInput = {
    id?: SortOrder
    uuid?: SortOrderInput | SortOrder
    dataVenda?: SortOrder
    vendedor?: SortOrderInput | SortOrder
    clienteId?: SortOrderInput | SortOrder
    produtoNome?: SortOrderInput | SortOrder
    custoProduto?: SortOrderInput | SortOrder
    quantidade?: SortOrderInput | SortOrder
    valorVenda?: SortOrderInput | SortOrder
    valorFrete?: SortOrderInput | SortOrder
    custoEnvio?: SortOrderInput | SortOrder
    parcelas?: SortOrderInput | SortOrder
    valorParcela?: SortOrderInput | SortOrder
    taxaFinanceiraValor?: SortOrderInput | SortOrder
    lucroLiquido?: SortOrderInput | SortOrder
    antecipada?: SortOrderInput | SortOrder
    excedeuLimite?: SortOrderInput | SortOrder
    temNota?: SortOrder
    taxaNota?: SortOrderInput | SortOrder
    comprovantePdf?: SortOrderInput | SortOrder
    descontoEmFolha?: SortOrder
    assinaturaToken?: SortOrderInput | SortOrder
    assinaturaStatus?: SortOrderInput | SortOrder
    assinaturaEm?: SortOrderInput | SortOrder
    boleto?: SortOrder
    asaasPaymentId?: SortOrderInput | SortOrder
    boletoUrl?: SortOrderInput | SortOrder
    cliente?: ClienteOrderByWithRelationInput
    itens?: ItemVendaOrderByRelationAggregateInput
    parcelasVencimento?: ParcelaVencimentoOrderByRelationAggregateInput
    documentos?: DocumentoOrderByRelationAggregateInput
  }

  export type VendaWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    uuid?: string
    assinaturaToken?: string
    AND?: VendaWhereInput | VendaWhereInput[]
    OR?: VendaWhereInput[]
    NOT?: VendaWhereInput | VendaWhereInput[]
    dataVenda?: DateTimeFilter<"Venda"> | Date | string
    vendedor?: StringNullableFilter<"Venda"> | string | null
    clienteId?: IntNullableFilter<"Venda"> | number | null
    produtoNome?: StringNullableFilter<"Venda"> | string | null
    custoProduto?: FloatNullableFilter<"Venda"> | number | null
    quantidade?: IntNullableFilter<"Venda"> | number | null
    valorVenda?: FloatNullableFilter<"Venda"> | number | null
    valorFrete?: FloatNullableFilter<"Venda"> | number | null
    custoEnvio?: FloatNullableFilter<"Venda"> | number | null
    parcelas?: IntNullableFilter<"Venda"> | number | null
    valorParcela?: FloatNullableFilter<"Venda"> | number | null
    taxaFinanceiraValor?: FloatNullableFilter<"Venda"> | number | null
    lucroLiquido?: FloatNullableFilter<"Venda"> | number | null
    antecipada?: IntNullableFilter<"Venda"> | number | null
    excedeuLimite?: IntNullableFilter<"Venda"> | number | null
    temNota?: BoolFilter<"Venda"> | boolean
    taxaNota?: FloatNullableFilter<"Venda"> | number | null
    comprovantePdf?: StringNullableFilter<"Venda"> | string | null
    descontoEmFolha?: BoolFilter<"Venda"> | boolean
    assinaturaStatus?: StringNullableFilter<"Venda"> | string | null
    assinaturaEm?: DateTimeNullableFilter<"Venda"> | Date | string | null
    boleto?: BoolFilter<"Venda"> | boolean
    asaasPaymentId?: StringNullableFilter<"Venda"> | string | null
    boletoUrl?: StringNullableFilter<"Venda"> | string | null
    cliente?: XOR<ClienteNullableScalarRelationFilter, ClienteWhereInput> | null
    itens?: ItemVendaListRelationFilter
    parcelasVencimento?: ParcelaVencimentoListRelationFilter
    documentos?: DocumentoListRelationFilter
  }, "id" | "uuid" | "assinaturaToken">

  export type VendaOrderByWithAggregationInput = {
    id?: SortOrder
    uuid?: SortOrderInput | SortOrder
    dataVenda?: SortOrder
    vendedor?: SortOrderInput | SortOrder
    clienteId?: SortOrderInput | SortOrder
    produtoNome?: SortOrderInput | SortOrder
    custoProduto?: SortOrderInput | SortOrder
    quantidade?: SortOrderInput | SortOrder
    valorVenda?: SortOrderInput | SortOrder
    valorFrete?: SortOrderInput | SortOrder
    custoEnvio?: SortOrderInput | SortOrder
    parcelas?: SortOrderInput | SortOrder
    valorParcela?: SortOrderInput | SortOrder
    taxaFinanceiraValor?: SortOrderInput | SortOrder
    lucroLiquido?: SortOrderInput | SortOrder
    antecipada?: SortOrderInput | SortOrder
    excedeuLimite?: SortOrderInput | SortOrder
    temNota?: SortOrder
    taxaNota?: SortOrderInput | SortOrder
    comprovantePdf?: SortOrderInput | SortOrder
    descontoEmFolha?: SortOrder
    assinaturaToken?: SortOrderInput | SortOrder
    assinaturaStatus?: SortOrderInput | SortOrder
    assinaturaEm?: SortOrderInput | SortOrder
    boleto?: SortOrder
    asaasPaymentId?: SortOrderInput | SortOrder
    boletoUrl?: SortOrderInput | SortOrder
    _count?: VendaCountOrderByAggregateInput
    _avg?: VendaAvgOrderByAggregateInput
    _max?: VendaMaxOrderByAggregateInput
    _min?: VendaMinOrderByAggregateInput
    _sum?: VendaSumOrderByAggregateInput
  }

  export type VendaScalarWhereWithAggregatesInput = {
    AND?: VendaScalarWhereWithAggregatesInput | VendaScalarWhereWithAggregatesInput[]
    OR?: VendaScalarWhereWithAggregatesInput[]
    NOT?: VendaScalarWhereWithAggregatesInput | VendaScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Venda"> | number
    uuid?: UuidNullableWithAggregatesFilter<"Venda"> | string | null
    dataVenda?: DateTimeWithAggregatesFilter<"Venda"> | Date | string
    vendedor?: StringNullableWithAggregatesFilter<"Venda"> | string | null
    clienteId?: IntNullableWithAggregatesFilter<"Venda"> | number | null
    produtoNome?: StringNullableWithAggregatesFilter<"Venda"> | string | null
    custoProduto?: FloatNullableWithAggregatesFilter<"Venda"> | number | null
    quantidade?: IntNullableWithAggregatesFilter<"Venda"> | number | null
    valorVenda?: FloatNullableWithAggregatesFilter<"Venda"> | number | null
    valorFrete?: FloatNullableWithAggregatesFilter<"Venda"> | number | null
    custoEnvio?: FloatNullableWithAggregatesFilter<"Venda"> | number | null
    parcelas?: IntNullableWithAggregatesFilter<"Venda"> | number | null
    valorParcela?: FloatNullableWithAggregatesFilter<"Venda"> | number | null
    taxaFinanceiraValor?: FloatNullableWithAggregatesFilter<"Venda"> | number | null
    lucroLiquido?: FloatNullableWithAggregatesFilter<"Venda"> | number | null
    antecipada?: IntNullableWithAggregatesFilter<"Venda"> | number | null
    excedeuLimite?: IntNullableWithAggregatesFilter<"Venda"> | number | null
    temNota?: BoolWithAggregatesFilter<"Venda"> | boolean
    taxaNota?: FloatNullableWithAggregatesFilter<"Venda"> | number | null
    comprovantePdf?: StringNullableWithAggregatesFilter<"Venda"> | string | null
    descontoEmFolha?: BoolWithAggregatesFilter<"Venda"> | boolean
    assinaturaToken?: StringNullableWithAggregatesFilter<"Venda"> | string | null
    assinaturaStatus?: StringNullableWithAggregatesFilter<"Venda"> | string | null
    assinaturaEm?: DateTimeNullableWithAggregatesFilter<"Venda"> | Date | string | null
    boleto?: BoolWithAggregatesFilter<"Venda"> | boolean
    asaasPaymentId?: StringNullableWithAggregatesFilter<"Venda"> | string | null
    boletoUrl?: StringNullableWithAggregatesFilter<"Venda"> | string | null
  }

  export type DocumentoWhereInput = {
    AND?: DocumentoWhereInput | DocumentoWhereInput[]
    OR?: DocumentoWhereInput[]
    NOT?: DocumentoWhereInput | DocumentoWhereInput[]
    id?: IntFilter<"Documento"> | number
    vendaId?: IntNullableFilter<"Documento"> | number | null
    tipo?: StringFilter<"Documento"> | string
    mimeType?: StringFilter<"Documento"> | string
    conteudo?: BytesFilter<"Documento"> | Bytes
    tamanhoBytes?: IntFilter<"Documento"> | number
    criadoEm?: DateTimeFilter<"Documento"> | Date | string
    venda?: XOR<VendaNullableScalarRelationFilter, VendaWhereInput> | null
  }

  export type DocumentoOrderByWithRelationInput = {
    id?: SortOrder
    vendaId?: SortOrderInput | SortOrder
    tipo?: SortOrder
    mimeType?: SortOrder
    conteudo?: SortOrder
    tamanhoBytes?: SortOrder
    criadoEm?: SortOrder
    venda?: VendaOrderByWithRelationInput
  }

  export type DocumentoWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: DocumentoWhereInput | DocumentoWhereInput[]
    OR?: DocumentoWhereInput[]
    NOT?: DocumentoWhereInput | DocumentoWhereInput[]
    vendaId?: IntNullableFilter<"Documento"> | number | null
    tipo?: StringFilter<"Documento"> | string
    mimeType?: StringFilter<"Documento"> | string
    conteudo?: BytesFilter<"Documento"> | Bytes
    tamanhoBytes?: IntFilter<"Documento"> | number
    criadoEm?: DateTimeFilter<"Documento"> | Date | string
    venda?: XOR<VendaNullableScalarRelationFilter, VendaWhereInput> | null
  }, "id">

  export type DocumentoOrderByWithAggregationInput = {
    id?: SortOrder
    vendaId?: SortOrderInput | SortOrder
    tipo?: SortOrder
    mimeType?: SortOrder
    conteudo?: SortOrder
    tamanhoBytes?: SortOrder
    criadoEm?: SortOrder
    _count?: DocumentoCountOrderByAggregateInput
    _avg?: DocumentoAvgOrderByAggregateInput
    _max?: DocumentoMaxOrderByAggregateInput
    _min?: DocumentoMinOrderByAggregateInput
    _sum?: DocumentoSumOrderByAggregateInput
  }

  export type DocumentoScalarWhereWithAggregatesInput = {
    AND?: DocumentoScalarWhereWithAggregatesInput | DocumentoScalarWhereWithAggregatesInput[]
    OR?: DocumentoScalarWhereWithAggregatesInput[]
    NOT?: DocumentoScalarWhereWithAggregatesInput | DocumentoScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Documento"> | number
    vendaId?: IntNullableWithAggregatesFilter<"Documento"> | number | null
    tipo?: StringWithAggregatesFilter<"Documento"> | string
    mimeType?: StringWithAggregatesFilter<"Documento"> | string
    conteudo?: BytesWithAggregatesFilter<"Documento"> | Bytes
    tamanhoBytes?: IntWithAggregatesFilter<"Documento"> | number
    criadoEm?: DateTimeWithAggregatesFilter<"Documento"> | Date | string
  }

  export type ItemVendaWhereInput = {
    AND?: ItemVendaWhereInput | ItemVendaWhereInput[]
    OR?: ItemVendaWhereInput[]
    NOT?: ItemVendaWhereInput | ItemVendaWhereInput[]
    id?: IntFilter<"ItemVenda"> | number
    vendaId?: IntFilter<"ItemVenda"> | number
    produtoNome?: StringFilter<"ItemVenda"> | string
    custoProduto?: FloatFilter<"ItemVenda"> | number
    valorVenda?: FloatFilter<"ItemVenda"> | number
    quantidade?: IntFilter<"ItemVenda"> | number
    subtotal?: FloatFilter<"ItemVenda"> | number
    venda?: XOR<VendaScalarRelationFilter, VendaWhereInput>
  }

  export type ItemVendaOrderByWithRelationInput = {
    id?: SortOrder
    vendaId?: SortOrder
    produtoNome?: SortOrder
    custoProduto?: SortOrder
    valorVenda?: SortOrder
    quantidade?: SortOrder
    subtotal?: SortOrder
    venda?: VendaOrderByWithRelationInput
  }

  export type ItemVendaWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: ItemVendaWhereInput | ItemVendaWhereInput[]
    OR?: ItemVendaWhereInput[]
    NOT?: ItemVendaWhereInput | ItemVendaWhereInput[]
    vendaId?: IntFilter<"ItemVenda"> | number
    produtoNome?: StringFilter<"ItemVenda"> | string
    custoProduto?: FloatFilter<"ItemVenda"> | number
    valorVenda?: FloatFilter<"ItemVenda"> | number
    quantidade?: IntFilter<"ItemVenda"> | number
    subtotal?: FloatFilter<"ItemVenda"> | number
    venda?: XOR<VendaScalarRelationFilter, VendaWhereInput>
  }, "id">

  export type ItemVendaOrderByWithAggregationInput = {
    id?: SortOrder
    vendaId?: SortOrder
    produtoNome?: SortOrder
    custoProduto?: SortOrder
    valorVenda?: SortOrder
    quantidade?: SortOrder
    subtotal?: SortOrder
    _count?: ItemVendaCountOrderByAggregateInput
    _avg?: ItemVendaAvgOrderByAggregateInput
    _max?: ItemVendaMaxOrderByAggregateInput
    _min?: ItemVendaMinOrderByAggregateInput
    _sum?: ItemVendaSumOrderByAggregateInput
  }

  export type ItemVendaScalarWhereWithAggregatesInput = {
    AND?: ItemVendaScalarWhereWithAggregatesInput | ItemVendaScalarWhereWithAggregatesInput[]
    OR?: ItemVendaScalarWhereWithAggregatesInput[]
    NOT?: ItemVendaScalarWhereWithAggregatesInput | ItemVendaScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"ItemVenda"> | number
    vendaId?: IntWithAggregatesFilter<"ItemVenda"> | number
    produtoNome?: StringWithAggregatesFilter<"ItemVenda"> | string
    custoProduto?: FloatWithAggregatesFilter<"ItemVenda"> | number
    valorVenda?: FloatWithAggregatesFilter<"ItemVenda"> | number
    quantidade?: IntWithAggregatesFilter<"ItemVenda"> | number
    subtotal?: FloatWithAggregatesFilter<"ItemVenda"> | number
  }

  export type ParcelaVencimentoWhereInput = {
    AND?: ParcelaVencimentoWhereInput | ParcelaVencimentoWhereInput[]
    OR?: ParcelaVencimentoWhereInput[]
    NOT?: ParcelaVencimentoWhereInput | ParcelaVencimentoWhereInput[]
    id?: IntFilter<"ParcelaVencimento"> | number
    vendaId?: IntFilter<"ParcelaVencimento"> | number
    numeroParcela?: IntFilter<"ParcelaVencimento"> | number
    dataVencimento?: DateTimeFilter<"ParcelaVencimento"> | Date | string
    valorParcela?: FloatFilter<"ParcelaVencimento"> | number
    paga?: BoolFilter<"ParcelaVencimento"> | boolean
    dataPagamento?: DateTimeNullableFilter<"ParcelaVencimento"> | Date | string | null
    venda?: XOR<VendaScalarRelationFilter, VendaWhereInput>
  }

  export type ParcelaVencimentoOrderByWithRelationInput = {
    id?: SortOrder
    vendaId?: SortOrder
    numeroParcela?: SortOrder
    dataVencimento?: SortOrder
    valorParcela?: SortOrder
    paga?: SortOrder
    dataPagamento?: SortOrderInput | SortOrder
    venda?: VendaOrderByWithRelationInput
  }

  export type ParcelaVencimentoWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: ParcelaVencimentoWhereInput | ParcelaVencimentoWhereInput[]
    OR?: ParcelaVencimentoWhereInput[]
    NOT?: ParcelaVencimentoWhereInput | ParcelaVencimentoWhereInput[]
    vendaId?: IntFilter<"ParcelaVencimento"> | number
    numeroParcela?: IntFilter<"ParcelaVencimento"> | number
    dataVencimento?: DateTimeFilter<"ParcelaVencimento"> | Date | string
    valorParcela?: FloatFilter<"ParcelaVencimento"> | number
    paga?: BoolFilter<"ParcelaVencimento"> | boolean
    dataPagamento?: DateTimeNullableFilter<"ParcelaVencimento"> | Date | string | null
    venda?: XOR<VendaScalarRelationFilter, VendaWhereInput>
  }, "id">

  export type ParcelaVencimentoOrderByWithAggregationInput = {
    id?: SortOrder
    vendaId?: SortOrder
    numeroParcela?: SortOrder
    dataVencimento?: SortOrder
    valorParcela?: SortOrder
    paga?: SortOrder
    dataPagamento?: SortOrderInput | SortOrder
    _count?: ParcelaVencimentoCountOrderByAggregateInput
    _avg?: ParcelaVencimentoAvgOrderByAggregateInput
    _max?: ParcelaVencimentoMaxOrderByAggregateInput
    _min?: ParcelaVencimentoMinOrderByAggregateInput
    _sum?: ParcelaVencimentoSumOrderByAggregateInput
  }

  export type ParcelaVencimentoScalarWhereWithAggregatesInput = {
    AND?: ParcelaVencimentoScalarWhereWithAggregatesInput | ParcelaVencimentoScalarWhereWithAggregatesInput[]
    OR?: ParcelaVencimentoScalarWhereWithAggregatesInput[]
    NOT?: ParcelaVencimentoScalarWhereWithAggregatesInput | ParcelaVencimentoScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"ParcelaVencimento"> | number
    vendaId?: IntWithAggregatesFilter<"ParcelaVencimento"> | number
    numeroParcela?: IntWithAggregatesFilter<"ParcelaVencimento"> | number
    dataVencimento?: DateTimeWithAggregatesFilter<"ParcelaVencimento"> | Date | string
    valorParcela?: FloatWithAggregatesFilter<"ParcelaVencimento"> | number
    paga?: BoolWithAggregatesFilter<"ParcelaVencimento"> | boolean
    dataPagamento?: DateTimeNullableWithAggregatesFilter<"ParcelaVencimento"> | Date | string | null
  }

  export type ConfigWhereInput = {
    AND?: ConfigWhereInput | ConfigWhereInput[]
    OR?: ConfigWhereInput[]
    NOT?: ConfigWhereInput | ConfigWhereInput[]
    id?: IntFilter<"Config"> | number
    modeloContrato?: StringNullableFilter<"Config"> | string | null
    modeloReciboVenda?: StringNullableFilter<"Config"> | string | null
    logoPath?: StringNullableFilter<"Config"> | string | null
    openaiKey?: StringNullableFilter<"Config"> | string | null
    geminiKey?: StringNullableFilter<"Config"> | string | null
    evolutionApiUrl?: StringNullableFilter<"Config"> | string | null
    evolutionApiKey?: StringNullableFilter<"Config"> | string | null
    evolutionInstance?: StringNullableFilter<"Config"> | string | null
    whatsappAutoEnabled?: IntNullableFilter<"Config"> | number | null
  }

  export type ConfigOrderByWithRelationInput = {
    id?: SortOrder
    modeloContrato?: SortOrderInput | SortOrder
    modeloReciboVenda?: SortOrderInput | SortOrder
    logoPath?: SortOrderInput | SortOrder
    openaiKey?: SortOrderInput | SortOrder
    geminiKey?: SortOrderInput | SortOrder
    evolutionApiUrl?: SortOrderInput | SortOrder
    evolutionApiKey?: SortOrderInput | SortOrder
    evolutionInstance?: SortOrderInput | SortOrder
    whatsappAutoEnabled?: SortOrderInput | SortOrder
  }

  export type ConfigWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: ConfigWhereInput | ConfigWhereInput[]
    OR?: ConfigWhereInput[]
    NOT?: ConfigWhereInput | ConfigWhereInput[]
    modeloContrato?: StringNullableFilter<"Config"> | string | null
    modeloReciboVenda?: StringNullableFilter<"Config"> | string | null
    logoPath?: StringNullableFilter<"Config"> | string | null
    openaiKey?: StringNullableFilter<"Config"> | string | null
    geminiKey?: StringNullableFilter<"Config"> | string | null
    evolutionApiUrl?: StringNullableFilter<"Config"> | string | null
    evolutionApiKey?: StringNullableFilter<"Config"> | string | null
    evolutionInstance?: StringNullableFilter<"Config"> | string | null
    whatsappAutoEnabled?: IntNullableFilter<"Config"> | number | null
  }, "id">

  export type ConfigOrderByWithAggregationInput = {
    id?: SortOrder
    modeloContrato?: SortOrderInput | SortOrder
    modeloReciboVenda?: SortOrderInput | SortOrder
    logoPath?: SortOrderInput | SortOrder
    openaiKey?: SortOrderInput | SortOrder
    geminiKey?: SortOrderInput | SortOrder
    evolutionApiUrl?: SortOrderInput | SortOrder
    evolutionApiKey?: SortOrderInput | SortOrder
    evolutionInstance?: SortOrderInput | SortOrder
    whatsappAutoEnabled?: SortOrderInput | SortOrder
    _count?: ConfigCountOrderByAggregateInput
    _avg?: ConfigAvgOrderByAggregateInput
    _max?: ConfigMaxOrderByAggregateInput
    _min?: ConfigMinOrderByAggregateInput
    _sum?: ConfigSumOrderByAggregateInput
  }

  export type ConfigScalarWhereWithAggregatesInput = {
    AND?: ConfigScalarWhereWithAggregatesInput | ConfigScalarWhereWithAggregatesInput[]
    OR?: ConfigScalarWhereWithAggregatesInput[]
    NOT?: ConfigScalarWhereWithAggregatesInput | ConfigScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Config"> | number
    modeloContrato?: StringNullableWithAggregatesFilter<"Config"> | string | null
    modeloReciboVenda?: StringNullableWithAggregatesFilter<"Config"> | string | null
    logoPath?: StringNullableWithAggregatesFilter<"Config"> | string | null
    openaiKey?: StringNullableWithAggregatesFilter<"Config"> | string | null
    geminiKey?: StringNullableWithAggregatesFilter<"Config"> | string | null
    evolutionApiUrl?: StringNullableWithAggregatesFilter<"Config"> | string | null
    evolutionApiKey?: StringNullableWithAggregatesFilter<"Config"> | string | null
    evolutionInstance?: StringNullableWithAggregatesFilter<"Config"> | string | null
    whatsappAutoEnabled?: IntNullableWithAggregatesFilter<"Config"> | number | null
  }

  export type UsuarioWhereInput = {
    AND?: UsuarioWhereInput | UsuarioWhereInput[]
    OR?: UsuarioWhereInput[]
    NOT?: UsuarioWhereInput | UsuarioWhereInput[]
    id?: IntFilter<"Usuario"> | number
    username?: StringFilter<"Usuario"> | string
    password?: StringFilter<"Usuario"> | string
    role?: StringNullableFilter<"Usuario"> | string | null
    nomeExibicao?: StringNullableFilter<"Usuario"> | string | null
    email?: StringNullableFilter<"Usuario"> | string | null
    telefone?: StringNullableFilter<"Usuario"> | string | null
    dataNascimento?: DateTimeNullableFilter<"Usuario"> | Date | string | null
    endereco?: StringNullableFilter<"Usuario"> | string | null
    cep?: StringNullableFilter<"Usuario"> | string | null
    metaMensal?: FloatNullableFilter<"Usuario"> | number | null
    comissaoPct?: FloatNullableFilter<"Usuario"> | number | null
  }

  export type UsuarioOrderByWithRelationInput = {
    id?: SortOrder
    username?: SortOrder
    password?: SortOrder
    role?: SortOrderInput | SortOrder
    nomeExibicao?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    telefone?: SortOrderInput | SortOrder
    dataNascimento?: SortOrderInput | SortOrder
    endereco?: SortOrderInput | SortOrder
    cep?: SortOrderInput | SortOrder
    metaMensal?: SortOrderInput | SortOrder
    comissaoPct?: SortOrderInput | SortOrder
  }

  export type UsuarioWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    username?: string
    AND?: UsuarioWhereInput | UsuarioWhereInput[]
    OR?: UsuarioWhereInput[]
    NOT?: UsuarioWhereInput | UsuarioWhereInput[]
    password?: StringFilter<"Usuario"> | string
    role?: StringNullableFilter<"Usuario"> | string | null
    nomeExibicao?: StringNullableFilter<"Usuario"> | string | null
    email?: StringNullableFilter<"Usuario"> | string | null
    telefone?: StringNullableFilter<"Usuario"> | string | null
    dataNascimento?: DateTimeNullableFilter<"Usuario"> | Date | string | null
    endereco?: StringNullableFilter<"Usuario"> | string | null
    cep?: StringNullableFilter<"Usuario"> | string | null
    metaMensal?: FloatNullableFilter<"Usuario"> | number | null
    comissaoPct?: FloatNullableFilter<"Usuario"> | number | null
  }, "id" | "username">

  export type UsuarioOrderByWithAggregationInput = {
    id?: SortOrder
    username?: SortOrder
    password?: SortOrder
    role?: SortOrderInput | SortOrder
    nomeExibicao?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    telefone?: SortOrderInput | SortOrder
    dataNascimento?: SortOrderInput | SortOrder
    endereco?: SortOrderInput | SortOrder
    cep?: SortOrderInput | SortOrder
    metaMensal?: SortOrderInput | SortOrder
    comissaoPct?: SortOrderInput | SortOrder
    _count?: UsuarioCountOrderByAggregateInput
    _avg?: UsuarioAvgOrderByAggregateInput
    _max?: UsuarioMaxOrderByAggregateInput
    _min?: UsuarioMinOrderByAggregateInput
    _sum?: UsuarioSumOrderByAggregateInput
  }

  export type UsuarioScalarWhereWithAggregatesInput = {
    AND?: UsuarioScalarWhereWithAggregatesInput | UsuarioScalarWhereWithAggregatesInput[]
    OR?: UsuarioScalarWhereWithAggregatesInput[]
    NOT?: UsuarioScalarWhereWithAggregatesInput | UsuarioScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Usuario"> | number
    username?: StringWithAggregatesFilter<"Usuario"> | string
    password?: StringWithAggregatesFilter<"Usuario"> | string
    role?: StringNullableWithAggregatesFilter<"Usuario"> | string | null
    nomeExibicao?: StringNullableWithAggregatesFilter<"Usuario"> | string | null
    email?: StringNullableWithAggregatesFilter<"Usuario"> | string | null
    telefone?: StringNullableWithAggregatesFilter<"Usuario"> | string | null
    dataNascimento?: DateTimeNullableWithAggregatesFilter<"Usuario"> | Date | string | null
    endereco?: StringNullableWithAggregatesFilter<"Usuario"> | string | null
    cep?: StringNullableWithAggregatesFilter<"Usuario"> | string | null
    metaMensal?: FloatNullableWithAggregatesFilter<"Usuario"> | number | null
    comissaoPct?: FloatNullableWithAggregatesFilter<"Usuario"> | number | null
  }

  export type FornecedorWhereInput = {
    AND?: FornecedorWhereInput | FornecedorWhereInput[]
    OR?: FornecedorWhereInput[]
    NOT?: FornecedorWhereInput | FornecedorWhereInput[]
    id?: IntFilter<"Fornecedor"> | number
    nome?: StringFilter<"Fornecedor"> | string
    telefone?: StringNullableFilter<"Fornecedor"> | string | null
    produtos?: ProdutoListRelationFilter
  }

  export type FornecedorOrderByWithRelationInput = {
    id?: SortOrder
    nome?: SortOrder
    telefone?: SortOrderInput | SortOrder
    produtos?: ProdutoOrderByRelationAggregateInput
  }

  export type FornecedorWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    nome?: string
    AND?: FornecedorWhereInput | FornecedorWhereInput[]
    OR?: FornecedorWhereInput[]
    NOT?: FornecedorWhereInput | FornecedorWhereInput[]
    telefone?: StringNullableFilter<"Fornecedor"> | string | null
    produtos?: ProdutoListRelationFilter
  }, "id" | "nome">

  export type FornecedorOrderByWithAggregationInput = {
    id?: SortOrder
    nome?: SortOrder
    telefone?: SortOrderInput | SortOrder
    _count?: FornecedorCountOrderByAggregateInput
    _avg?: FornecedorAvgOrderByAggregateInput
    _max?: FornecedorMaxOrderByAggregateInput
    _min?: FornecedorMinOrderByAggregateInput
    _sum?: FornecedorSumOrderByAggregateInput
  }

  export type FornecedorScalarWhereWithAggregatesInput = {
    AND?: FornecedorScalarWhereWithAggregatesInput | FornecedorScalarWhereWithAggregatesInput[]
    OR?: FornecedorScalarWhereWithAggregatesInput[]
    NOT?: FornecedorScalarWhereWithAggregatesInput | FornecedorScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Fornecedor"> | number
    nome?: StringWithAggregatesFilter<"Fornecedor"> | string
    telefone?: StringNullableWithAggregatesFilter<"Fornecedor"> | string | null
  }

  export type EmpresaParceiraWhereInput = {
    AND?: EmpresaParceiraWhereInput | EmpresaParceiraWhereInput[]
    OR?: EmpresaParceiraWhereInput[]
    NOT?: EmpresaParceiraWhereInput | EmpresaParceiraWhereInput[]
    id?: IntFilter<"EmpresaParceira"> | number
    nome?: StringFilter<"EmpresaParceira"> | string
    responsavelRh?: StringNullableFilter<"EmpresaParceira"> | string | null
    telefoneRh?: StringNullableFilter<"EmpresaParceira"> | string | null
    emailRh?: StringNullableFilter<"EmpresaParceira"> | string | null
  }

  export type EmpresaParceiraOrderByWithRelationInput = {
    id?: SortOrder
    nome?: SortOrder
    responsavelRh?: SortOrderInput | SortOrder
    telefoneRh?: SortOrderInput | SortOrder
    emailRh?: SortOrderInput | SortOrder
  }

  export type EmpresaParceiraWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    nome?: string
    AND?: EmpresaParceiraWhereInput | EmpresaParceiraWhereInput[]
    OR?: EmpresaParceiraWhereInput[]
    NOT?: EmpresaParceiraWhereInput | EmpresaParceiraWhereInput[]
    responsavelRh?: StringNullableFilter<"EmpresaParceira"> | string | null
    telefoneRh?: StringNullableFilter<"EmpresaParceira"> | string | null
    emailRh?: StringNullableFilter<"EmpresaParceira"> | string | null
  }, "id" | "nome">

  export type EmpresaParceiraOrderByWithAggregationInput = {
    id?: SortOrder
    nome?: SortOrder
    responsavelRh?: SortOrderInput | SortOrder
    telefoneRh?: SortOrderInput | SortOrder
    emailRh?: SortOrderInput | SortOrder
    _count?: EmpresaParceiraCountOrderByAggregateInput
    _avg?: EmpresaParceiraAvgOrderByAggregateInput
    _max?: EmpresaParceiraMaxOrderByAggregateInput
    _min?: EmpresaParceiraMinOrderByAggregateInput
    _sum?: EmpresaParceiraSumOrderByAggregateInput
  }

  export type EmpresaParceiraScalarWhereWithAggregatesInput = {
    AND?: EmpresaParceiraScalarWhereWithAggregatesInput | EmpresaParceiraScalarWhereWithAggregatesInput[]
    OR?: EmpresaParceiraScalarWhereWithAggregatesInput[]
    NOT?: EmpresaParceiraScalarWhereWithAggregatesInput | EmpresaParceiraScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"EmpresaParceira"> | number
    nome?: StringWithAggregatesFilter<"EmpresaParceira"> | string
    responsavelRh?: StringNullableWithAggregatesFilter<"EmpresaParceira"> | string | null
    telefoneRh?: StringNullableWithAggregatesFilter<"EmpresaParceira"> | string | null
    emailRh?: StringNullableWithAggregatesFilter<"EmpresaParceira"> | string | null
  }

  export type PagamentoWhereInput = {
    AND?: PagamentoWhereInput | PagamentoWhereInput[]
    OR?: PagamentoWhereInput[]
    NOT?: PagamentoWhereInput | PagamentoWhereInput[]
    id?: IntFilter<"Pagamento"> | number
    dataPagamento?: DateTimeFilter<"Pagamento"> | Date | string
    vendedor?: StringNullableFilter<"Pagamento"> | string | null
    valor?: FloatNullableFilter<"Pagamento"> | number | null
    obs?: StringNullableFilter<"Pagamento"> | string | null
  }

  export type PagamentoOrderByWithRelationInput = {
    id?: SortOrder
    dataPagamento?: SortOrder
    vendedor?: SortOrderInput | SortOrder
    valor?: SortOrderInput | SortOrder
    obs?: SortOrderInput | SortOrder
  }

  export type PagamentoWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: PagamentoWhereInput | PagamentoWhereInput[]
    OR?: PagamentoWhereInput[]
    NOT?: PagamentoWhereInput | PagamentoWhereInput[]
    dataPagamento?: DateTimeFilter<"Pagamento"> | Date | string
    vendedor?: StringNullableFilter<"Pagamento"> | string | null
    valor?: FloatNullableFilter<"Pagamento"> | number | null
    obs?: StringNullableFilter<"Pagamento"> | string | null
  }, "id">

  export type PagamentoOrderByWithAggregationInput = {
    id?: SortOrder
    dataPagamento?: SortOrder
    vendedor?: SortOrderInput | SortOrder
    valor?: SortOrderInput | SortOrder
    obs?: SortOrderInput | SortOrder
    _count?: PagamentoCountOrderByAggregateInput
    _avg?: PagamentoAvgOrderByAggregateInput
    _max?: PagamentoMaxOrderByAggregateInput
    _min?: PagamentoMinOrderByAggregateInput
    _sum?: PagamentoSumOrderByAggregateInput
  }

  export type PagamentoScalarWhereWithAggregatesInput = {
    AND?: PagamentoScalarWhereWithAggregatesInput | PagamentoScalarWhereWithAggregatesInput[]
    OR?: PagamentoScalarWhereWithAggregatesInput[]
    NOT?: PagamentoScalarWhereWithAggregatesInput | PagamentoScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Pagamento"> | number
    dataPagamento?: DateTimeWithAggregatesFilter<"Pagamento"> | Date | string
    vendedor?: StringNullableWithAggregatesFilter<"Pagamento"> | string | null
    valor?: FloatNullableWithAggregatesFilter<"Pagamento"> | number | null
    obs?: StringNullableWithAggregatesFilter<"Pagamento"> | string | null
  }

  export type AuditLogWhereInput = {
    AND?: AuditLogWhereInput | AuditLogWhereInput[]
    OR?: AuditLogWhereInput[]
    NOT?: AuditLogWhereInput | AuditLogWhereInput[]
    id?: IntFilter<"AuditLog"> | number
    dataHora?: DateTimeFilter<"AuditLog"> | Date | string
    usuario?: StringNullableFilter<"AuditLog"> | string | null
    acao?: StringNullableFilter<"AuditLog"> | string | null
    detalhes?: StringNullableFilter<"AuditLog"> | string | null
  }

  export type AuditLogOrderByWithRelationInput = {
    id?: SortOrder
    dataHora?: SortOrder
    usuario?: SortOrderInput | SortOrder
    acao?: SortOrderInput | SortOrder
    detalhes?: SortOrderInput | SortOrder
  }

  export type AuditLogWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: AuditLogWhereInput | AuditLogWhereInput[]
    OR?: AuditLogWhereInput[]
    NOT?: AuditLogWhereInput | AuditLogWhereInput[]
    dataHora?: DateTimeFilter<"AuditLog"> | Date | string
    usuario?: StringNullableFilter<"AuditLog"> | string | null
    acao?: StringNullableFilter<"AuditLog"> | string | null
    detalhes?: StringNullableFilter<"AuditLog"> | string | null
  }, "id">

  export type AuditLogOrderByWithAggregationInput = {
    id?: SortOrder
    dataHora?: SortOrder
    usuario?: SortOrderInput | SortOrder
    acao?: SortOrderInput | SortOrder
    detalhes?: SortOrderInput | SortOrder
    _count?: AuditLogCountOrderByAggregateInput
    _avg?: AuditLogAvgOrderByAggregateInput
    _max?: AuditLogMaxOrderByAggregateInput
    _min?: AuditLogMinOrderByAggregateInput
    _sum?: AuditLogSumOrderByAggregateInput
  }

  export type AuditLogScalarWhereWithAggregatesInput = {
    AND?: AuditLogScalarWhereWithAggregatesInput | AuditLogScalarWhereWithAggregatesInput[]
    OR?: AuditLogScalarWhereWithAggregatesInput[]
    NOT?: AuditLogScalarWhereWithAggregatesInput | AuditLogScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"AuditLog"> | number
    dataHora?: DateTimeWithAggregatesFilter<"AuditLog"> | Date | string
    usuario?: StringNullableWithAggregatesFilter<"AuditLog"> | string | null
    acao?: StringNullableWithAggregatesFilter<"AuditLog"> | string | null
    detalhes?: StringNullableWithAggregatesFilter<"AuditLog"> | string | null
  }

  export type DespesaWhereInput = {
    AND?: DespesaWhereInput | DespesaWhereInput[]
    OR?: DespesaWhereInput[]
    NOT?: DespesaWhereInput | DespesaWhereInput[]
    id?: IntFilter<"Despesa"> | number
    dataDespesa?: DateTimeFilter<"Despesa"> | Date | string
    descricao?: StringNullableFilter<"Despesa"> | string | null
    categoria?: StringNullableFilter<"Despesa"> | string | null
    valor?: FloatNullableFilter<"Despesa"> | number | null
    tipo?: StringNullableFilter<"Despesa"> | string | null
  }

  export type DespesaOrderByWithRelationInput = {
    id?: SortOrder
    dataDespesa?: SortOrder
    descricao?: SortOrderInput | SortOrder
    categoria?: SortOrderInput | SortOrder
    valor?: SortOrderInput | SortOrder
    tipo?: SortOrderInput | SortOrder
  }

  export type DespesaWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: DespesaWhereInput | DespesaWhereInput[]
    OR?: DespesaWhereInput[]
    NOT?: DespesaWhereInput | DespesaWhereInput[]
    dataDespesa?: DateTimeFilter<"Despesa"> | Date | string
    descricao?: StringNullableFilter<"Despesa"> | string | null
    categoria?: StringNullableFilter<"Despesa"> | string | null
    valor?: FloatNullableFilter<"Despesa"> | number | null
    tipo?: StringNullableFilter<"Despesa"> | string | null
  }, "id">

  export type DespesaOrderByWithAggregationInput = {
    id?: SortOrder
    dataDespesa?: SortOrder
    descricao?: SortOrderInput | SortOrder
    categoria?: SortOrderInput | SortOrder
    valor?: SortOrderInput | SortOrder
    tipo?: SortOrderInput | SortOrder
    _count?: DespesaCountOrderByAggregateInput
    _avg?: DespesaAvgOrderByAggregateInput
    _max?: DespesaMaxOrderByAggregateInput
    _min?: DespesaMinOrderByAggregateInput
    _sum?: DespesaSumOrderByAggregateInput
  }

  export type DespesaScalarWhereWithAggregatesInput = {
    AND?: DespesaScalarWhereWithAggregatesInput | DespesaScalarWhereWithAggregatesInput[]
    OR?: DespesaScalarWhereWithAggregatesInput[]
    NOT?: DespesaScalarWhereWithAggregatesInput | DespesaScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Despesa"> | number
    dataDespesa?: DateTimeWithAggregatesFilter<"Despesa"> | Date | string
    descricao?: StringNullableWithAggregatesFilter<"Despesa"> | string | null
    categoria?: StringNullableWithAggregatesFilter<"Despesa"> | string | null
    valor?: FloatNullableWithAggregatesFilter<"Despesa"> | number | null
    tipo?: StringNullableWithAggregatesFilter<"Despesa"> | string | null
  }

  export type AvisoWhereInput = {
    AND?: AvisoWhereInput | AvisoWhereInput[]
    OR?: AvisoWhereInput[]
    NOT?: AvisoWhereInput | AvisoWhereInput[]
    id?: IntFilter<"Aviso"> | number
    dataCriacao?: DateTimeFilter<"Aviso"> | Date | string
    mensagem?: StringNullableFilter<"Aviso"> | string | null
    ativo?: IntNullableFilter<"Aviso"> | number | null
  }

  export type AvisoOrderByWithRelationInput = {
    id?: SortOrder
    dataCriacao?: SortOrder
    mensagem?: SortOrderInput | SortOrder
    ativo?: SortOrderInput | SortOrder
  }

  export type AvisoWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: AvisoWhereInput | AvisoWhereInput[]
    OR?: AvisoWhereInput[]
    NOT?: AvisoWhereInput | AvisoWhereInput[]
    dataCriacao?: DateTimeFilter<"Aviso"> | Date | string
    mensagem?: StringNullableFilter<"Aviso"> | string | null
    ativo?: IntNullableFilter<"Aviso"> | number | null
  }, "id">

  export type AvisoOrderByWithAggregationInput = {
    id?: SortOrder
    dataCriacao?: SortOrder
    mensagem?: SortOrderInput | SortOrder
    ativo?: SortOrderInput | SortOrder
    _count?: AvisoCountOrderByAggregateInput
    _avg?: AvisoAvgOrderByAggregateInput
    _max?: AvisoMaxOrderByAggregateInput
    _min?: AvisoMinOrderByAggregateInput
    _sum?: AvisoSumOrderByAggregateInput
  }

  export type AvisoScalarWhereWithAggregatesInput = {
    AND?: AvisoScalarWhereWithAggregatesInput | AvisoScalarWhereWithAggregatesInput[]
    OR?: AvisoScalarWhereWithAggregatesInput[]
    NOT?: AvisoScalarWhereWithAggregatesInput | AvisoScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Aviso"> | number
    dataCriacao?: DateTimeWithAggregatesFilter<"Aviso"> | Date | string
    mensagem?: StringNullableWithAggregatesFilter<"Aviso"> | string | null
    ativo?: IntNullableWithAggregatesFilter<"Aviso"> | number | null
  }

  export type ClienteCreateInput = {
    nome: string
    renda?: number | null
    empresa?: string | null
    matricula?: string | null
    telefone?: string | null
    cpf?: string | null
    cnpj?: string | null
    tipo?: string | null
    dataNascimento?: Date | string | null
    cep?: string | null
    endereco?: string | null
    email?: string | null
    asaasCustomerId?: string | null
    vendas?: VendaCreateNestedManyWithoutClienteInput
  }

  export type ClienteUncheckedCreateInput = {
    id?: number
    nome: string
    renda?: number | null
    empresa?: string | null
    matricula?: string | null
    telefone?: string | null
    cpf?: string | null
    cnpj?: string | null
    tipo?: string | null
    dataNascimento?: Date | string | null
    cep?: string | null
    endereco?: string | null
    email?: string | null
    asaasCustomerId?: string | null
    vendas?: VendaUncheckedCreateNestedManyWithoutClienteInput
  }

  export type ClienteUpdateInput = {
    nome?: StringFieldUpdateOperationsInput | string
    renda?: NullableFloatFieldUpdateOperationsInput | number | null
    empresa?: NullableStringFieldUpdateOperationsInput | string | null
    matricula?: NullableStringFieldUpdateOperationsInput | string | null
    telefone?: NullableStringFieldUpdateOperationsInput | string | null
    cpf?: NullableStringFieldUpdateOperationsInput | string | null
    cnpj?: NullableStringFieldUpdateOperationsInput | string | null
    tipo?: NullableStringFieldUpdateOperationsInput | string | null
    dataNascimento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cep?: NullableStringFieldUpdateOperationsInput | string | null
    endereco?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    asaasCustomerId?: NullableStringFieldUpdateOperationsInput | string | null
    vendas?: VendaUpdateManyWithoutClienteNestedInput
  }

  export type ClienteUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    nome?: StringFieldUpdateOperationsInput | string
    renda?: NullableFloatFieldUpdateOperationsInput | number | null
    empresa?: NullableStringFieldUpdateOperationsInput | string | null
    matricula?: NullableStringFieldUpdateOperationsInput | string | null
    telefone?: NullableStringFieldUpdateOperationsInput | string | null
    cpf?: NullableStringFieldUpdateOperationsInput | string | null
    cnpj?: NullableStringFieldUpdateOperationsInput | string | null
    tipo?: NullableStringFieldUpdateOperationsInput | string | null
    dataNascimento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cep?: NullableStringFieldUpdateOperationsInput | string | null
    endereco?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    asaasCustomerId?: NullableStringFieldUpdateOperationsInput | string | null
    vendas?: VendaUncheckedUpdateManyWithoutClienteNestedInput
  }

  export type ClienteCreateManyInput = {
    id?: number
    nome: string
    renda?: number | null
    empresa?: string | null
    matricula?: string | null
    telefone?: string | null
    cpf?: string | null
    cnpj?: string | null
    tipo?: string | null
    dataNascimento?: Date | string | null
    cep?: string | null
    endereco?: string | null
    email?: string | null
    asaasCustomerId?: string | null
  }

  export type ClienteUpdateManyMutationInput = {
    nome?: StringFieldUpdateOperationsInput | string
    renda?: NullableFloatFieldUpdateOperationsInput | number | null
    empresa?: NullableStringFieldUpdateOperationsInput | string | null
    matricula?: NullableStringFieldUpdateOperationsInput | string | null
    telefone?: NullableStringFieldUpdateOperationsInput | string | null
    cpf?: NullableStringFieldUpdateOperationsInput | string | null
    cnpj?: NullableStringFieldUpdateOperationsInput | string | null
    tipo?: NullableStringFieldUpdateOperationsInput | string | null
    dataNascimento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cep?: NullableStringFieldUpdateOperationsInput | string | null
    endereco?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    asaasCustomerId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ClienteUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    nome?: StringFieldUpdateOperationsInput | string
    renda?: NullableFloatFieldUpdateOperationsInput | number | null
    empresa?: NullableStringFieldUpdateOperationsInput | string | null
    matricula?: NullableStringFieldUpdateOperationsInput | string | null
    telefone?: NullableStringFieldUpdateOperationsInput | string | null
    cpf?: NullableStringFieldUpdateOperationsInput | string | null
    cnpj?: NullableStringFieldUpdateOperationsInput | string | null
    tipo?: NullableStringFieldUpdateOperationsInput | string | null
    dataNascimento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cep?: NullableStringFieldUpdateOperationsInput | string | null
    endereco?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    asaasCustomerId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ProdutoCreateInput = {
    nome: string
    custoPadrao?: number | null
    marca?: string | null
    categoria?: string | null
    ncm?: string | null
    imagem?: string | null
    qtdEstoque?: number | null
    valorVenda?: number | null
    fornecedor?: FornecedorCreateNestedOneWithoutProdutosInput
  }

  export type ProdutoUncheckedCreateInput = {
    id?: number
    nome: string
    custoPadrao?: number | null
    marca?: string | null
    categoria?: string | null
    ncm?: string | null
    imagem?: string | null
    fornecedorId?: number | null
    qtdEstoque?: number | null
    valorVenda?: number | null
  }

  export type ProdutoUpdateInput = {
    nome?: StringFieldUpdateOperationsInput | string
    custoPadrao?: NullableFloatFieldUpdateOperationsInput | number | null
    marca?: NullableStringFieldUpdateOperationsInput | string | null
    categoria?: NullableStringFieldUpdateOperationsInput | string | null
    ncm?: NullableStringFieldUpdateOperationsInput | string | null
    imagem?: NullableStringFieldUpdateOperationsInput | string | null
    qtdEstoque?: NullableIntFieldUpdateOperationsInput | number | null
    valorVenda?: NullableFloatFieldUpdateOperationsInput | number | null
    fornecedor?: FornecedorUpdateOneWithoutProdutosNestedInput
  }

  export type ProdutoUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    nome?: StringFieldUpdateOperationsInput | string
    custoPadrao?: NullableFloatFieldUpdateOperationsInput | number | null
    marca?: NullableStringFieldUpdateOperationsInput | string | null
    categoria?: NullableStringFieldUpdateOperationsInput | string | null
    ncm?: NullableStringFieldUpdateOperationsInput | string | null
    imagem?: NullableStringFieldUpdateOperationsInput | string | null
    fornecedorId?: NullableIntFieldUpdateOperationsInput | number | null
    qtdEstoque?: NullableIntFieldUpdateOperationsInput | number | null
    valorVenda?: NullableFloatFieldUpdateOperationsInput | number | null
  }

  export type ProdutoCreateManyInput = {
    id?: number
    nome: string
    custoPadrao?: number | null
    marca?: string | null
    categoria?: string | null
    ncm?: string | null
    imagem?: string | null
    fornecedorId?: number | null
    qtdEstoque?: number | null
    valorVenda?: number | null
  }

  export type ProdutoUpdateManyMutationInput = {
    nome?: StringFieldUpdateOperationsInput | string
    custoPadrao?: NullableFloatFieldUpdateOperationsInput | number | null
    marca?: NullableStringFieldUpdateOperationsInput | string | null
    categoria?: NullableStringFieldUpdateOperationsInput | string | null
    ncm?: NullableStringFieldUpdateOperationsInput | string | null
    imagem?: NullableStringFieldUpdateOperationsInput | string | null
    qtdEstoque?: NullableIntFieldUpdateOperationsInput | number | null
    valorVenda?: NullableFloatFieldUpdateOperationsInput | number | null
  }

  export type ProdutoUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    nome?: StringFieldUpdateOperationsInput | string
    custoPadrao?: NullableFloatFieldUpdateOperationsInput | number | null
    marca?: NullableStringFieldUpdateOperationsInput | string | null
    categoria?: NullableStringFieldUpdateOperationsInput | string | null
    ncm?: NullableStringFieldUpdateOperationsInput | string | null
    imagem?: NullableStringFieldUpdateOperationsInput | string | null
    fornecedorId?: NullableIntFieldUpdateOperationsInput | number | null
    qtdEstoque?: NullableIntFieldUpdateOperationsInput | number | null
    valorVenda?: NullableFloatFieldUpdateOperationsInput | number | null
  }

  export type VendaCreateInput = {
    uuid?: string | null
    dataVenda: Date | string
    vendedor?: string | null
    produtoNome?: string | null
    custoProduto?: number | null
    quantidade?: number | null
    valorVenda?: number | null
    valorFrete?: number | null
    custoEnvio?: number | null
    parcelas?: number | null
    valorParcela?: number | null
    taxaFinanceiraValor?: number | null
    lucroLiquido?: number | null
    antecipada?: number | null
    excedeuLimite?: number | null
    temNota?: boolean
    taxaNota?: number | null
    comprovantePdf?: string | null
    descontoEmFolha?: boolean
    assinaturaToken?: string | null
    assinaturaStatus?: string | null
    assinaturaEm?: Date | string | null
    boleto?: boolean
    asaasPaymentId?: string | null
    boletoUrl?: string | null
    cliente?: ClienteCreateNestedOneWithoutVendasInput
    itens?: ItemVendaCreateNestedManyWithoutVendaInput
    parcelasVencimento?: ParcelaVencimentoCreateNestedManyWithoutVendaInput
    documentos?: DocumentoCreateNestedManyWithoutVendaInput
  }

  export type VendaUncheckedCreateInput = {
    id?: number
    uuid?: string | null
    dataVenda: Date | string
    vendedor?: string | null
    clienteId?: number | null
    produtoNome?: string | null
    custoProduto?: number | null
    quantidade?: number | null
    valorVenda?: number | null
    valorFrete?: number | null
    custoEnvio?: number | null
    parcelas?: number | null
    valorParcela?: number | null
    taxaFinanceiraValor?: number | null
    lucroLiquido?: number | null
    antecipada?: number | null
    excedeuLimite?: number | null
    temNota?: boolean
    taxaNota?: number | null
    comprovantePdf?: string | null
    descontoEmFolha?: boolean
    assinaturaToken?: string | null
    assinaturaStatus?: string | null
    assinaturaEm?: Date | string | null
    boleto?: boolean
    asaasPaymentId?: string | null
    boletoUrl?: string | null
    itens?: ItemVendaUncheckedCreateNestedManyWithoutVendaInput
    parcelasVencimento?: ParcelaVencimentoUncheckedCreateNestedManyWithoutVendaInput
    documentos?: DocumentoUncheckedCreateNestedManyWithoutVendaInput
  }

  export type VendaUpdateInput = {
    uuid?: NullableStringFieldUpdateOperationsInput | string | null
    dataVenda?: DateTimeFieldUpdateOperationsInput | Date | string
    vendedor?: NullableStringFieldUpdateOperationsInput | string | null
    produtoNome?: NullableStringFieldUpdateOperationsInput | string | null
    custoProduto?: NullableFloatFieldUpdateOperationsInput | number | null
    quantidade?: NullableIntFieldUpdateOperationsInput | number | null
    valorVenda?: NullableFloatFieldUpdateOperationsInput | number | null
    valorFrete?: NullableFloatFieldUpdateOperationsInput | number | null
    custoEnvio?: NullableFloatFieldUpdateOperationsInput | number | null
    parcelas?: NullableIntFieldUpdateOperationsInput | number | null
    valorParcela?: NullableFloatFieldUpdateOperationsInput | number | null
    taxaFinanceiraValor?: NullableFloatFieldUpdateOperationsInput | number | null
    lucroLiquido?: NullableFloatFieldUpdateOperationsInput | number | null
    antecipada?: NullableIntFieldUpdateOperationsInput | number | null
    excedeuLimite?: NullableIntFieldUpdateOperationsInput | number | null
    temNota?: BoolFieldUpdateOperationsInput | boolean
    taxaNota?: NullableFloatFieldUpdateOperationsInput | number | null
    comprovantePdf?: NullableStringFieldUpdateOperationsInput | string | null
    descontoEmFolha?: BoolFieldUpdateOperationsInput | boolean
    assinaturaToken?: NullableStringFieldUpdateOperationsInput | string | null
    assinaturaStatus?: NullableStringFieldUpdateOperationsInput | string | null
    assinaturaEm?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    boleto?: BoolFieldUpdateOperationsInput | boolean
    asaasPaymentId?: NullableStringFieldUpdateOperationsInput | string | null
    boletoUrl?: NullableStringFieldUpdateOperationsInput | string | null
    cliente?: ClienteUpdateOneWithoutVendasNestedInput
    itens?: ItemVendaUpdateManyWithoutVendaNestedInput
    parcelasVencimento?: ParcelaVencimentoUpdateManyWithoutVendaNestedInput
    documentos?: DocumentoUpdateManyWithoutVendaNestedInput
  }

  export type VendaUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    uuid?: NullableStringFieldUpdateOperationsInput | string | null
    dataVenda?: DateTimeFieldUpdateOperationsInput | Date | string
    vendedor?: NullableStringFieldUpdateOperationsInput | string | null
    clienteId?: NullableIntFieldUpdateOperationsInput | number | null
    produtoNome?: NullableStringFieldUpdateOperationsInput | string | null
    custoProduto?: NullableFloatFieldUpdateOperationsInput | number | null
    quantidade?: NullableIntFieldUpdateOperationsInput | number | null
    valorVenda?: NullableFloatFieldUpdateOperationsInput | number | null
    valorFrete?: NullableFloatFieldUpdateOperationsInput | number | null
    custoEnvio?: NullableFloatFieldUpdateOperationsInput | number | null
    parcelas?: NullableIntFieldUpdateOperationsInput | number | null
    valorParcela?: NullableFloatFieldUpdateOperationsInput | number | null
    taxaFinanceiraValor?: NullableFloatFieldUpdateOperationsInput | number | null
    lucroLiquido?: NullableFloatFieldUpdateOperationsInput | number | null
    antecipada?: NullableIntFieldUpdateOperationsInput | number | null
    excedeuLimite?: NullableIntFieldUpdateOperationsInput | number | null
    temNota?: BoolFieldUpdateOperationsInput | boolean
    taxaNota?: NullableFloatFieldUpdateOperationsInput | number | null
    comprovantePdf?: NullableStringFieldUpdateOperationsInput | string | null
    descontoEmFolha?: BoolFieldUpdateOperationsInput | boolean
    assinaturaToken?: NullableStringFieldUpdateOperationsInput | string | null
    assinaturaStatus?: NullableStringFieldUpdateOperationsInput | string | null
    assinaturaEm?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    boleto?: BoolFieldUpdateOperationsInput | boolean
    asaasPaymentId?: NullableStringFieldUpdateOperationsInput | string | null
    boletoUrl?: NullableStringFieldUpdateOperationsInput | string | null
    itens?: ItemVendaUncheckedUpdateManyWithoutVendaNestedInput
    parcelasVencimento?: ParcelaVencimentoUncheckedUpdateManyWithoutVendaNestedInput
    documentos?: DocumentoUncheckedUpdateManyWithoutVendaNestedInput
  }

  export type VendaCreateManyInput = {
    id?: number
    uuid?: string | null
    dataVenda: Date | string
    vendedor?: string | null
    clienteId?: number | null
    produtoNome?: string | null
    custoProduto?: number | null
    quantidade?: number | null
    valorVenda?: number | null
    valorFrete?: number | null
    custoEnvio?: number | null
    parcelas?: number | null
    valorParcela?: number | null
    taxaFinanceiraValor?: number | null
    lucroLiquido?: number | null
    antecipada?: number | null
    excedeuLimite?: number | null
    temNota?: boolean
    taxaNota?: number | null
    comprovantePdf?: string | null
    descontoEmFolha?: boolean
    assinaturaToken?: string | null
    assinaturaStatus?: string | null
    assinaturaEm?: Date | string | null
    boleto?: boolean
    asaasPaymentId?: string | null
    boletoUrl?: string | null
  }

  export type VendaUpdateManyMutationInput = {
    uuid?: NullableStringFieldUpdateOperationsInput | string | null
    dataVenda?: DateTimeFieldUpdateOperationsInput | Date | string
    vendedor?: NullableStringFieldUpdateOperationsInput | string | null
    produtoNome?: NullableStringFieldUpdateOperationsInput | string | null
    custoProduto?: NullableFloatFieldUpdateOperationsInput | number | null
    quantidade?: NullableIntFieldUpdateOperationsInput | number | null
    valorVenda?: NullableFloatFieldUpdateOperationsInput | number | null
    valorFrete?: NullableFloatFieldUpdateOperationsInput | number | null
    custoEnvio?: NullableFloatFieldUpdateOperationsInput | number | null
    parcelas?: NullableIntFieldUpdateOperationsInput | number | null
    valorParcela?: NullableFloatFieldUpdateOperationsInput | number | null
    taxaFinanceiraValor?: NullableFloatFieldUpdateOperationsInput | number | null
    lucroLiquido?: NullableFloatFieldUpdateOperationsInput | number | null
    antecipada?: NullableIntFieldUpdateOperationsInput | number | null
    excedeuLimite?: NullableIntFieldUpdateOperationsInput | number | null
    temNota?: BoolFieldUpdateOperationsInput | boolean
    taxaNota?: NullableFloatFieldUpdateOperationsInput | number | null
    comprovantePdf?: NullableStringFieldUpdateOperationsInput | string | null
    descontoEmFolha?: BoolFieldUpdateOperationsInput | boolean
    assinaturaToken?: NullableStringFieldUpdateOperationsInput | string | null
    assinaturaStatus?: NullableStringFieldUpdateOperationsInput | string | null
    assinaturaEm?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    boleto?: BoolFieldUpdateOperationsInput | boolean
    asaasPaymentId?: NullableStringFieldUpdateOperationsInput | string | null
    boletoUrl?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type VendaUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    uuid?: NullableStringFieldUpdateOperationsInput | string | null
    dataVenda?: DateTimeFieldUpdateOperationsInput | Date | string
    vendedor?: NullableStringFieldUpdateOperationsInput | string | null
    clienteId?: NullableIntFieldUpdateOperationsInput | number | null
    produtoNome?: NullableStringFieldUpdateOperationsInput | string | null
    custoProduto?: NullableFloatFieldUpdateOperationsInput | number | null
    quantidade?: NullableIntFieldUpdateOperationsInput | number | null
    valorVenda?: NullableFloatFieldUpdateOperationsInput | number | null
    valorFrete?: NullableFloatFieldUpdateOperationsInput | number | null
    custoEnvio?: NullableFloatFieldUpdateOperationsInput | number | null
    parcelas?: NullableIntFieldUpdateOperationsInput | number | null
    valorParcela?: NullableFloatFieldUpdateOperationsInput | number | null
    taxaFinanceiraValor?: NullableFloatFieldUpdateOperationsInput | number | null
    lucroLiquido?: NullableFloatFieldUpdateOperationsInput | number | null
    antecipada?: NullableIntFieldUpdateOperationsInput | number | null
    excedeuLimite?: NullableIntFieldUpdateOperationsInput | number | null
    temNota?: BoolFieldUpdateOperationsInput | boolean
    taxaNota?: NullableFloatFieldUpdateOperationsInput | number | null
    comprovantePdf?: NullableStringFieldUpdateOperationsInput | string | null
    descontoEmFolha?: BoolFieldUpdateOperationsInput | boolean
    assinaturaToken?: NullableStringFieldUpdateOperationsInput | string | null
    assinaturaStatus?: NullableStringFieldUpdateOperationsInput | string | null
    assinaturaEm?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    boleto?: BoolFieldUpdateOperationsInput | boolean
    asaasPaymentId?: NullableStringFieldUpdateOperationsInput | string | null
    boletoUrl?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type DocumentoCreateInput = {
    tipo: string
    mimeType?: string
    conteudo: Bytes
    tamanhoBytes: number
    criadoEm?: Date | string
    venda?: VendaCreateNestedOneWithoutDocumentosInput
  }

  export type DocumentoUncheckedCreateInput = {
    id?: number
    vendaId?: number | null
    tipo: string
    mimeType?: string
    conteudo: Bytes
    tamanhoBytes: number
    criadoEm?: Date | string
  }

  export type DocumentoUpdateInput = {
    tipo?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    conteudo?: BytesFieldUpdateOperationsInput | Bytes
    tamanhoBytes?: IntFieldUpdateOperationsInput | number
    criadoEm?: DateTimeFieldUpdateOperationsInput | Date | string
    venda?: VendaUpdateOneWithoutDocumentosNestedInput
  }

  export type DocumentoUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    vendaId?: NullableIntFieldUpdateOperationsInput | number | null
    tipo?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    conteudo?: BytesFieldUpdateOperationsInput | Bytes
    tamanhoBytes?: IntFieldUpdateOperationsInput | number
    criadoEm?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DocumentoCreateManyInput = {
    id?: number
    vendaId?: number | null
    tipo: string
    mimeType?: string
    conteudo: Bytes
    tamanhoBytes: number
    criadoEm?: Date | string
  }

  export type DocumentoUpdateManyMutationInput = {
    tipo?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    conteudo?: BytesFieldUpdateOperationsInput | Bytes
    tamanhoBytes?: IntFieldUpdateOperationsInput | number
    criadoEm?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DocumentoUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    vendaId?: NullableIntFieldUpdateOperationsInput | number | null
    tipo?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    conteudo?: BytesFieldUpdateOperationsInput | Bytes
    tamanhoBytes?: IntFieldUpdateOperationsInput | number
    criadoEm?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ItemVendaCreateInput = {
    produtoNome: string
    custoProduto: number
    valorVenda: number
    quantidade?: number
    subtotal: number
    venda: VendaCreateNestedOneWithoutItensInput
  }

  export type ItemVendaUncheckedCreateInput = {
    id?: number
    vendaId: number
    produtoNome: string
    custoProduto: number
    valorVenda: number
    quantidade?: number
    subtotal: number
  }

  export type ItemVendaUpdateInput = {
    produtoNome?: StringFieldUpdateOperationsInput | string
    custoProduto?: FloatFieldUpdateOperationsInput | number
    valorVenda?: FloatFieldUpdateOperationsInput | number
    quantidade?: IntFieldUpdateOperationsInput | number
    subtotal?: FloatFieldUpdateOperationsInput | number
    venda?: VendaUpdateOneRequiredWithoutItensNestedInput
  }

  export type ItemVendaUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    vendaId?: IntFieldUpdateOperationsInput | number
    produtoNome?: StringFieldUpdateOperationsInput | string
    custoProduto?: FloatFieldUpdateOperationsInput | number
    valorVenda?: FloatFieldUpdateOperationsInput | number
    quantidade?: IntFieldUpdateOperationsInput | number
    subtotal?: FloatFieldUpdateOperationsInput | number
  }

  export type ItemVendaCreateManyInput = {
    id?: number
    vendaId: number
    produtoNome: string
    custoProduto: number
    valorVenda: number
    quantidade?: number
    subtotal: number
  }

  export type ItemVendaUpdateManyMutationInput = {
    produtoNome?: StringFieldUpdateOperationsInput | string
    custoProduto?: FloatFieldUpdateOperationsInput | number
    valorVenda?: FloatFieldUpdateOperationsInput | number
    quantidade?: IntFieldUpdateOperationsInput | number
    subtotal?: FloatFieldUpdateOperationsInput | number
  }

  export type ItemVendaUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    vendaId?: IntFieldUpdateOperationsInput | number
    produtoNome?: StringFieldUpdateOperationsInput | string
    custoProduto?: FloatFieldUpdateOperationsInput | number
    valorVenda?: FloatFieldUpdateOperationsInput | number
    quantidade?: IntFieldUpdateOperationsInput | number
    subtotal?: FloatFieldUpdateOperationsInput | number
  }

  export type ParcelaVencimentoCreateInput = {
    numeroParcela: number
    dataVencimento: Date | string
    valorParcela: number
    paga?: boolean
    dataPagamento?: Date | string | null
    venda: VendaCreateNestedOneWithoutParcelasVencimentoInput
  }

  export type ParcelaVencimentoUncheckedCreateInput = {
    id?: number
    vendaId: number
    numeroParcela: number
    dataVencimento: Date | string
    valorParcela: number
    paga?: boolean
    dataPagamento?: Date | string | null
  }

  export type ParcelaVencimentoUpdateInput = {
    numeroParcela?: IntFieldUpdateOperationsInput | number
    dataVencimento?: DateTimeFieldUpdateOperationsInput | Date | string
    valorParcela?: FloatFieldUpdateOperationsInput | number
    paga?: BoolFieldUpdateOperationsInput | boolean
    dataPagamento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    venda?: VendaUpdateOneRequiredWithoutParcelasVencimentoNestedInput
  }

  export type ParcelaVencimentoUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    vendaId?: IntFieldUpdateOperationsInput | number
    numeroParcela?: IntFieldUpdateOperationsInput | number
    dataVencimento?: DateTimeFieldUpdateOperationsInput | Date | string
    valorParcela?: FloatFieldUpdateOperationsInput | number
    paga?: BoolFieldUpdateOperationsInput | boolean
    dataPagamento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type ParcelaVencimentoCreateManyInput = {
    id?: number
    vendaId: number
    numeroParcela: number
    dataVencimento: Date | string
    valorParcela: number
    paga?: boolean
    dataPagamento?: Date | string | null
  }

  export type ParcelaVencimentoUpdateManyMutationInput = {
    numeroParcela?: IntFieldUpdateOperationsInput | number
    dataVencimento?: DateTimeFieldUpdateOperationsInput | Date | string
    valorParcela?: FloatFieldUpdateOperationsInput | number
    paga?: BoolFieldUpdateOperationsInput | boolean
    dataPagamento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type ParcelaVencimentoUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    vendaId?: IntFieldUpdateOperationsInput | number
    numeroParcela?: IntFieldUpdateOperationsInput | number
    dataVencimento?: DateTimeFieldUpdateOperationsInput | Date | string
    valorParcela?: FloatFieldUpdateOperationsInput | number
    paga?: BoolFieldUpdateOperationsInput | boolean
    dataPagamento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type ConfigCreateInput = {
    modeloContrato?: string | null
    modeloReciboVenda?: string | null
    logoPath?: string | null
    openaiKey?: string | null
    geminiKey?: string | null
    evolutionApiUrl?: string | null
    evolutionApiKey?: string | null
    evolutionInstance?: string | null
    whatsappAutoEnabled?: number | null
  }

  export type ConfigUncheckedCreateInput = {
    id?: number
    modeloContrato?: string | null
    modeloReciboVenda?: string | null
    logoPath?: string | null
    openaiKey?: string | null
    geminiKey?: string | null
    evolutionApiUrl?: string | null
    evolutionApiKey?: string | null
    evolutionInstance?: string | null
    whatsappAutoEnabled?: number | null
  }

  export type ConfigUpdateInput = {
    modeloContrato?: NullableStringFieldUpdateOperationsInput | string | null
    modeloReciboVenda?: NullableStringFieldUpdateOperationsInput | string | null
    logoPath?: NullableStringFieldUpdateOperationsInput | string | null
    openaiKey?: NullableStringFieldUpdateOperationsInput | string | null
    geminiKey?: NullableStringFieldUpdateOperationsInput | string | null
    evolutionApiUrl?: NullableStringFieldUpdateOperationsInput | string | null
    evolutionApiKey?: NullableStringFieldUpdateOperationsInput | string | null
    evolutionInstance?: NullableStringFieldUpdateOperationsInput | string | null
    whatsappAutoEnabled?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type ConfigUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    modeloContrato?: NullableStringFieldUpdateOperationsInput | string | null
    modeloReciboVenda?: NullableStringFieldUpdateOperationsInput | string | null
    logoPath?: NullableStringFieldUpdateOperationsInput | string | null
    openaiKey?: NullableStringFieldUpdateOperationsInput | string | null
    geminiKey?: NullableStringFieldUpdateOperationsInput | string | null
    evolutionApiUrl?: NullableStringFieldUpdateOperationsInput | string | null
    evolutionApiKey?: NullableStringFieldUpdateOperationsInput | string | null
    evolutionInstance?: NullableStringFieldUpdateOperationsInput | string | null
    whatsappAutoEnabled?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type ConfigCreateManyInput = {
    id?: number
    modeloContrato?: string | null
    modeloReciboVenda?: string | null
    logoPath?: string | null
    openaiKey?: string | null
    geminiKey?: string | null
    evolutionApiUrl?: string | null
    evolutionApiKey?: string | null
    evolutionInstance?: string | null
    whatsappAutoEnabled?: number | null
  }

  export type ConfigUpdateManyMutationInput = {
    modeloContrato?: NullableStringFieldUpdateOperationsInput | string | null
    modeloReciboVenda?: NullableStringFieldUpdateOperationsInput | string | null
    logoPath?: NullableStringFieldUpdateOperationsInput | string | null
    openaiKey?: NullableStringFieldUpdateOperationsInput | string | null
    geminiKey?: NullableStringFieldUpdateOperationsInput | string | null
    evolutionApiUrl?: NullableStringFieldUpdateOperationsInput | string | null
    evolutionApiKey?: NullableStringFieldUpdateOperationsInput | string | null
    evolutionInstance?: NullableStringFieldUpdateOperationsInput | string | null
    whatsappAutoEnabled?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type ConfigUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    modeloContrato?: NullableStringFieldUpdateOperationsInput | string | null
    modeloReciboVenda?: NullableStringFieldUpdateOperationsInput | string | null
    logoPath?: NullableStringFieldUpdateOperationsInput | string | null
    openaiKey?: NullableStringFieldUpdateOperationsInput | string | null
    geminiKey?: NullableStringFieldUpdateOperationsInput | string | null
    evolutionApiUrl?: NullableStringFieldUpdateOperationsInput | string | null
    evolutionApiKey?: NullableStringFieldUpdateOperationsInput | string | null
    evolutionInstance?: NullableStringFieldUpdateOperationsInput | string | null
    whatsappAutoEnabled?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type UsuarioCreateInput = {
    username: string
    password: string
    role?: string | null
    nomeExibicao?: string | null
    email?: string | null
    telefone?: string | null
    dataNascimento?: Date | string | null
    endereco?: string | null
    cep?: string | null
    metaMensal?: number | null
    comissaoPct?: number | null
  }

  export type UsuarioUncheckedCreateInput = {
    id?: number
    username: string
    password: string
    role?: string | null
    nomeExibicao?: string | null
    email?: string | null
    telefone?: string | null
    dataNascimento?: Date | string | null
    endereco?: string | null
    cep?: string | null
    metaMensal?: number | null
    comissaoPct?: number | null
  }

  export type UsuarioUpdateInput = {
    username?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: NullableStringFieldUpdateOperationsInput | string | null
    nomeExibicao?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    telefone?: NullableStringFieldUpdateOperationsInput | string | null
    dataNascimento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    endereco?: NullableStringFieldUpdateOperationsInput | string | null
    cep?: NullableStringFieldUpdateOperationsInput | string | null
    metaMensal?: NullableFloatFieldUpdateOperationsInput | number | null
    comissaoPct?: NullableFloatFieldUpdateOperationsInput | number | null
  }

  export type UsuarioUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: NullableStringFieldUpdateOperationsInput | string | null
    nomeExibicao?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    telefone?: NullableStringFieldUpdateOperationsInput | string | null
    dataNascimento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    endereco?: NullableStringFieldUpdateOperationsInput | string | null
    cep?: NullableStringFieldUpdateOperationsInput | string | null
    metaMensal?: NullableFloatFieldUpdateOperationsInput | number | null
    comissaoPct?: NullableFloatFieldUpdateOperationsInput | number | null
  }

  export type UsuarioCreateManyInput = {
    id?: number
    username: string
    password: string
    role?: string | null
    nomeExibicao?: string | null
    email?: string | null
    telefone?: string | null
    dataNascimento?: Date | string | null
    endereco?: string | null
    cep?: string | null
    metaMensal?: number | null
    comissaoPct?: number | null
  }

  export type UsuarioUpdateManyMutationInput = {
    username?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: NullableStringFieldUpdateOperationsInput | string | null
    nomeExibicao?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    telefone?: NullableStringFieldUpdateOperationsInput | string | null
    dataNascimento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    endereco?: NullableStringFieldUpdateOperationsInput | string | null
    cep?: NullableStringFieldUpdateOperationsInput | string | null
    metaMensal?: NullableFloatFieldUpdateOperationsInput | number | null
    comissaoPct?: NullableFloatFieldUpdateOperationsInput | number | null
  }

  export type UsuarioUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: NullableStringFieldUpdateOperationsInput | string | null
    nomeExibicao?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    telefone?: NullableStringFieldUpdateOperationsInput | string | null
    dataNascimento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    endereco?: NullableStringFieldUpdateOperationsInput | string | null
    cep?: NullableStringFieldUpdateOperationsInput | string | null
    metaMensal?: NullableFloatFieldUpdateOperationsInput | number | null
    comissaoPct?: NullableFloatFieldUpdateOperationsInput | number | null
  }

  export type FornecedorCreateInput = {
    nome: string
    telefone?: string | null
    produtos?: ProdutoCreateNestedManyWithoutFornecedorInput
  }

  export type FornecedorUncheckedCreateInput = {
    id?: number
    nome: string
    telefone?: string | null
    produtos?: ProdutoUncheckedCreateNestedManyWithoutFornecedorInput
  }

  export type FornecedorUpdateInput = {
    nome?: StringFieldUpdateOperationsInput | string
    telefone?: NullableStringFieldUpdateOperationsInput | string | null
    produtos?: ProdutoUpdateManyWithoutFornecedorNestedInput
  }

  export type FornecedorUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    nome?: StringFieldUpdateOperationsInput | string
    telefone?: NullableStringFieldUpdateOperationsInput | string | null
    produtos?: ProdutoUncheckedUpdateManyWithoutFornecedorNestedInput
  }

  export type FornecedorCreateManyInput = {
    id?: number
    nome: string
    telefone?: string | null
  }

  export type FornecedorUpdateManyMutationInput = {
    nome?: StringFieldUpdateOperationsInput | string
    telefone?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type FornecedorUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    nome?: StringFieldUpdateOperationsInput | string
    telefone?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type EmpresaParceiraCreateInput = {
    nome: string
    responsavelRh?: string | null
    telefoneRh?: string | null
    emailRh?: string | null
  }

  export type EmpresaParceiraUncheckedCreateInput = {
    id?: number
    nome: string
    responsavelRh?: string | null
    telefoneRh?: string | null
    emailRh?: string | null
  }

  export type EmpresaParceiraUpdateInput = {
    nome?: StringFieldUpdateOperationsInput | string
    responsavelRh?: NullableStringFieldUpdateOperationsInput | string | null
    telefoneRh?: NullableStringFieldUpdateOperationsInput | string | null
    emailRh?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type EmpresaParceiraUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    nome?: StringFieldUpdateOperationsInput | string
    responsavelRh?: NullableStringFieldUpdateOperationsInput | string | null
    telefoneRh?: NullableStringFieldUpdateOperationsInput | string | null
    emailRh?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type EmpresaParceiraCreateManyInput = {
    id?: number
    nome: string
    responsavelRh?: string | null
    telefoneRh?: string | null
    emailRh?: string | null
  }

  export type EmpresaParceiraUpdateManyMutationInput = {
    nome?: StringFieldUpdateOperationsInput | string
    responsavelRh?: NullableStringFieldUpdateOperationsInput | string | null
    telefoneRh?: NullableStringFieldUpdateOperationsInput | string | null
    emailRh?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type EmpresaParceiraUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    nome?: StringFieldUpdateOperationsInput | string
    responsavelRh?: NullableStringFieldUpdateOperationsInput | string | null
    telefoneRh?: NullableStringFieldUpdateOperationsInput | string | null
    emailRh?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type PagamentoCreateInput = {
    dataPagamento: Date | string
    vendedor?: string | null
    valor?: number | null
    obs?: string | null
  }

  export type PagamentoUncheckedCreateInput = {
    id?: number
    dataPagamento: Date | string
    vendedor?: string | null
    valor?: number | null
    obs?: string | null
  }

  export type PagamentoUpdateInput = {
    dataPagamento?: DateTimeFieldUpdateOperationsInput | Date | string
    vendedor?: NullableStringFieldUpdateOperationsInput | string | null
    valor?: NullableFloatFieldUpdateOperationsInput | number | null
    obs?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type PagamentoUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    dataPagamento?: DateTimeFieldUpdateOperationsInput | Date | string
    vendedor?: NullableStringFieldUpdateOperationsInput | string | null
    valor?: NullableFloatFieldUpdateOperationsInput | number | null
    obs?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type PagamentoCreateManyInput = {
    id?: number
    dataPagamento: Date | string
    vendedor?: string | null
    valor?: number | null
    obs?: string | null
  }

  export type PagamentoUpdateManyMutationInput = {
    dataPagamento?: DateTimeFieldUpdateOperationsInput | Date | string
    vendedor?: NullableStringFieldUpdateOperationsInput | string | null
    valor?: NullableFloatFieldUpdateOperationsInput | number | null
    obs?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type PagamentoUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    dataPagamento?: DateTimeFieldUpdateOperationsInput | Date | string
    vendedor?: NullableStringFieldUpdateOperationsInput | string | null
    valor?: NullableFloatFieldUpdateOperationsInput | number | null
    obs?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type AuditLogCreateInput = {
    dataHora: Date | string
    usuario?: string | null
    acao?: string | null
    detalhes?: string | null
  }

  export type AuditLogUncheckedCreateInput = {
    id?: number
    dataHora: Date | string
    usuario?: string | null
    acao?: string | null
    detalhes?: string | null
  }

  export type AuditLogUpdateInput = {
    dataHora?: DateTimeFieldUpdateOperationsInput | Date | string
    usuario?: NullableStringFieldUpdateOperationsInput | string | null
    acao?: NullableStringFieldUpdateOperationsInput | string | null
    detalhes?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type AuditLogUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    dataHora?: DateTimeFieldUpdateOperationsInput | Date | string
    usuario?: NullableStringFieldUpdateOperationsInput | string | null
    acao?: NullableStringFieldUpdateOperationsInput | string | null
    detalhes?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type AuditLogCreateManyInput = {
    id?: number
    dataHora: Date | string
    usuario?: string | null
    acao?: string | null
    detalhes?: string | null
  }

  export type AuditLogUpdateManyMutationInput = {
    dataHora?: DateTimeFieldUpdateOperationsInput | Date | string
    usuario?: NullableStringFieldUpdateOperationsInput | string | null
    acao?: NullableStringFieldUpdateOperationsInput | string | null
    detalhes?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type AuditLogUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    dataHora?: DateTimeFieldUpdateOperationsInput | Date | string
    usuario?: NullableStringFieldUpdateOperationsInput | string | null
    acao?: NullableStringFieldUpdateOperationsInput | string | null
    detalhes?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type DespesaCreateInput = {
    dataDespesa: Date | string
    descricao?: string | null
    categoria?: string | null
    valor?: number | null
    tipo?: string | null
  }

  export type DespesaUncheckedCreateInput = {
    id?: number
    dataDespesa: Date | string
    descricao?: string | null
    categoria?: string | null
    valor?: number | null
    tipo?: string | null
  }

  export type DespesaUpdateInput = {
    dataDespesa?: DateTimeFieldUpdateOperationsInput | Date | string
    descricao?: NullableStringFieldUpdateOperationsInput | string | null
    categoria?: NullableStringFieldUpdateOperationsInput | string | null
    valor?: NullableFloatFieldUpdateOperationsInput | number | null
    tipo?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type DespesaUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    dataDespesa?: DateTimeFieldUpdateOperationsInput | Date | string
    descricao?: NullableStringFieldUpdateOperationsInput | string | null
    categoria?: NullableStringFieldUpdateOperationsInput | string | null
    valor?: NullableFloatFieldUpdateOperationsInput | number | null
    tipo?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type DespesaCreateManyInput = {
    id?: number
    dataDespesa: Date | string
    descricao?: string | null
    categoria?: string | null
    valor?: number | null
    tipo?: string | null
  }

  export type DespesaUpdateManyMutationInput = {
    dataDespesa?: DateTimeFieldUpdateOperationsInput | Date | string
    descricao?: NullableStringFieldUpdateOperationsInput | string | null
    categoria?: NullableStringFieldUpdateOperationsInput | string | null
    valor?: NullableFloatFieldUpdateOperationsInput | number | null
    tipo?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type DespesaUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    dataDespesa?: DateTimeFieldUpdateOperationsInput | Date | string
    descricao?: NullableStringFieldUpdateOperationsInput | string | null
    categoria?: NullableStringFieldUpdateOperationsInput | string | null
    valor?: NullableFloatFieldUpdateOperationsInput | number | null
    tipo?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type AvisoCreateInput = {
    dataCriacao?: Date | string
    mensagem?: string | null
    ativo?: number | null
  }

  export type AvisoUncheckedCreateInput = {
    id?: number
    dataCriacao?: Date | string
    mensagem?: string | null
    ativo?: number | null
  }

  export type AvisoUpdateInput = {
    dataCriacao?: DateTimeFieldUpdateOperationsInput | Date | string
    mensagem?: NullableStringFieldUpdateOperationsInput | string | null
    ativo?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type AvisoUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    dataCriacao?: DateTimeFieldUpdateOperationsInput | Date | string
    mensagem?: NullableStringFieldUpdateOperationsInput | string | null
    ativo?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type AvisoCreateManyInput = {
    id?: number
    dataCriacao?: Date | string
    mensagem?: string | null
    ativo?: number | null
  }

  export type AvisoUpdateManyMutationInput = {
    dataCriacao?: DateTimeFieldUpdateOperationsInput | Date | string
    mensagem?: NullableStringFieldUpdateOperationsInput | string | null
    ativo?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type AvisoUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    dataCriacao?: DateTimeFieldUpdateOperationsInput | Date | string
    mensagem?: NullableStringFieldUpdateOperationsInput | string | null
    ativo?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type FloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type VendaListRelationFilter = {
    every?: VendaWhereInput
    some?: VendaWhereInput
    none?: VendaWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type VendaOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ClienteCountOrderByAggregateInput = {
    id?: SortOrder
    nome?: SortOrder
    renda?: SortOrder
    empresa?: SortOrder
    matricula?: SortOrder
    telefone?: SortOrder
    cpf?: SortOrder
    cnpj?: SortOrder
    tipo?: SortOrder
    dataNascimento?: SortOrder
    cep?: SortOrder
    endereco?: SortOrder
    email?: SortOrder
    asaasCustomerId?: SortOrder
  }

  export type ClienteAvgOrderByAggregateInput = {
    id?: SortOrder
    renda?: SortOrder
  }

  export type ClienteMaxOrderByAggregateInput = {
    id?: SortOrder
    nome?: SortOrder
    renda?: SortOrder
    empresa?: SortOrder
    matricula?: SortOrder
    telefone?: SortOrder
    cpf?: SortOrder
    cnpj?: SortOrder
    tipo?: SortOrder
    dataNascimento?: SortOrder
    cep?: SortOrder
    endereco?: SortOrder
    email?: SortOrder
    asaasCustomerId?: SortOrder
  }

  export type ClienteMinOrderByAggregateInput = {
    id?: SortOrder
    nome?: SortOrder
    renda?: SortOrder
    empresa?: SortOrder
    matricula?: SortOrder
    telefone?: SortOrder
    cpf?: SortOrder
    cnpj?: SortOrder
    tipo?: SortOrder
    dataNascimento?: SortOrder
    cep?: SortOrder
    endereco?: SortOrder
    email?: SortOrder
    asaasCustomerId?: SortOrder
  }

  export type ClienteSumOrderByAggregateInput = {
    id?: SortOrder
    renda?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type FloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type FornecedorNullableScalarRelationFilter = {
    is?: FornecedorWhereInput | null
    isNot?: FornecedorWhereInput | null
  }

  export type ProdutoCountOrderByAggregateInput = {
    id?: SortOrder
    nome?: SortOrder
    custoPadrao?: SortOrder
    marca?: SortOrder
    categoria?: SortOrder
    ncm?: SortOrder
    imagem?: SortOrder
    fornecedorId?: SortOrder
    qtdEstoque?: SortOrder
    valorVenda?: SortOrder
  }

  export type ProdutoAvgOrderByAggregateInput = {
    id?: SortOrder
    custoPadrao?: SortOrder
    fornecedorId?: SortOrder
    qtdEstoque?: SortOrder
    valorVenda?: SortOrder
  }

  export type ProdutoMaxOrderByAggregateInput = {
    id?: SortOrder
    nome?: SortOrder
    custoPadrao?: SortOrder
    marca?: SortOrder
    categoria?: SortOrder
    ncm?: SortOrder
    imagem?: SortOrder
    fornecedorId?: SortOrder
    qtdEstoque?: SortOrder
    valorVenda?: SortOrder
  }

  export type ProdutoMinOrderByAggregateInput = {
    id?: SortOrder
    nome?: SortOrder
    custoPadrao?: SortOrder
    marca?: SortOrder
    categoria?: SortOrder
    ncm?: SortOrder
    imagem?: SortOrder
    fornecedorId?: SortOrder
    qtdEstoque?: SortOrder
    valorVenda?: SortOrder
  }

  export type ProdutoSumOrderByAggregateInput = {
    id?: SortOrder
    custoPadrao?: SortOrder
    fornecedorId?: SortOrder
    qtdEstoque?: SortOrder
    valorVenda?: SortOrder
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type UuidNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidNullableFilter<$PrismaModel> | string | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type ClienteNullableScalarRelationFilter = {
    is?: ClienteWhereInput | null
    isNot?: ClienteWhereInput | null
  }

  export type ItemVendaListRelationFilter = {
    every?: ItemVendaWhereInput
    some?: ItemVendaWhereInput
    none?: ItemVendaWhereInput
  }

  export type ParcelaVencimentoListRelationFilter = {
    every?: ParcelaVencimentoWhereInput
    some?: ParcelaVencimentoWhereInput
    none?: ParcelaVencimentoWhereInput
  }

  export type DocumentoListRelationFilter = {
    every?: DocumentoWhereInput
    some?: DocumentoWhereInput
    none?: DocumentoWhereInput
  }

  export type ItemVendaOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ParcelaVencimentoOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type DocumentoOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type VendaCountOrderByAggregateInput = {
    id?: SortOrder
    uuid?: SortOrder
    dataVenda?: SortOrder
    vendedor?: SortOrder
    clienteId?: SortOrder
    produtoNome?: SortOrder
    custoProduto?: SortOrder
    quantidade?: SortOrder
    valorVenda?: SortOrder
    valorFrete?: SortOrder
    custoEnvio?: SortOrder
    parcelas?: SortOrder
    valorParcela?: SortOrder
    taxaFinanceiraValor?: SortOrder
    lucroLiquido?: SortOrder
    antecipada?: SortOrder
    excedeuLimite?: SortOrder
    temNota?: SortOrder
    taxaNota?: SortOrder
    comprovantePdf?: SortOrder
    descontoEmFolha?: SortOrder
    assinaturaToken?: SortOrder
    assinaturaStatus?: SortOrder
    assinaturaEm?: SortOrder
    boleto?: SortOrder
    asaasPaymentId?: SortOrder
    boletoUrl?: SortOrder
  }

  export type VendaAvgOrderByAggregateInput = {
    id?: SortOrder
    clienteId?: SortOrder
    custoProduto?: SortOrder
    quantidade?: SortOrder
    valorVenda?: SortOrder
    valorFrete?: SortOrder
    custoEnvio?: SortOrder
    parcelas?: SortOrder
    valorParcela?: SortOrder
    taxaFinanceiraValor?: SortOrder
    lucroLiquido?: SortOrder
    antecipada?: SortOrder
    excedeuLimite?: SortOrder
    taxaNota?: SortOrder
  }

  export type VendaMaxOrderByAggregateInput = {
    id?: SortOrder
    uuid?: SortOrder
    dataVenda?: SortOrder
    vendedor?: SortOrder
    clienteId?: SortOrder
    produtoNome?: SortOrder
    custoProduto?: SortOrder
    quantidade?: SortOrder
    valorVenda?: SortOrder
    valorFrete?: SortOrder
    custoEnvio?: SortOrder
    parcelas?: SortOrder
    valorParcela?: SortOrder
    taxaFinanceiraValor?: SortOrder
    lucroLiquido?: SortOrder
    antecipada?: SortOrder
    excedeuLimite?: SortOrder
    temNota?: SortOrder
    taxaNota?: SortOrder
    comprovantePdf?: SortOrder
    descontoEmFolha?: SortOrder
    assinaturaToken?: SortOrder
    assinaturaStatus?: SortOrder
    assinaturaEm?: SortOrder
    boleto?: SortOrder
    asaasPaymentId?: SortOrder
    boletoUrl?: SortOrder
  }

  export type VendaMinOrderByAggregateInput = {
    id?: SortOrder
    uuid?: SortOrder
    dataVenda?: SortOrder
    vendedor?: SortOrder
    clienteId?: SortOrder
    produtoNome?: SortOrder
    custoProduto?: SortOrder
    quantidade?: SortOrder
    valorVenda?: SortOrder
    valorFrete?: SortOrder
    custoEnvio?: SortOrder
    parcelas?: SortOrder
    valorParcela?: SortOrder
    taxaFinanceiraValor?: SortOrder
    lucroLiquido?: SortOrder
    antecipada?: SortOrder
    excedeuLimite?: SortOrder
    temNota?: SortOrder
    taxaNota?: SortOrder
    comprovantePdf?: SortOrder
    descontoEmFolha?: SortOrder
    assinaturaToken?: SortOrder
    assinaturaStatus?: SortOrder
    assinaturaEm?: SortOrder
    boleto?: SortOrder
    asaasPaymentId?: SortOrder
    boletoUrl?: SortOrder
  }

  export type VendaSumOrderByAggregateInput = {
    id?: SortOrder
    clienteId?: SortOrder
    custoProduto?: SortOrder
    quantidade?: SortOrder
    valorVenda?: SortOrder
    valorFrete?: SortOrder
    custoEnvio?: SortOrder
    parcelas?: SortOrder
    valorParcela?: SortOrder
    taxaFinanceiraValor?: SortOrder
    lucroLiquido?: SortOrder
    antecipada?: SortOrder
    excedeuLimite?: SortOrder
    taxaNota?: SortOrder
  }

  export type UuidNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type BytesFilter<$PrismaModel = never> = {
    equals?: Bytes | BytesFieldRefInput<$PrismaModel>
    in?: Bytes[] | ListBytesFieldRefInput<$PrismaModel>
    notIn?: Bytes[] | ListBytesFieldRefInput<$PrismaModel>
    not?: NestedBytesFilter<$PrismaModel> | Bytes
  }

  export type VendaNullableScalarRelationFilter = {
    is?: VendaWhereInput | null
    isNot?: VendaWhereInput | null
  }

  export type DocumentoCountOrderByAggregateInput = {
    id?: SortOrder
    vendaId?: SortOrder
    tipo?: SortOrder
    mimeType?: SortOrder
    conteudo?: SortOrder
    tamanhoBytes?: SortOrder
    criadoEm?: SortOrder
  }

  export type DocumentoAvgOrderByAggregateInput = {
    id?: SortOrder
    vendaId?: SortOrder
    tamanhoBytes?: SortOrder
  }

  export type DocumentoMaxOrderByAggregateInput = {
    id?: SortOrder
    vendaId?: SortOrder
    tipo?: SortOrder
    mimeType?: SortOrder
    conteudo?: SortOrder
    tamanhoBytes?: SortOrder
    criadoEm?: SortOrder
  }

  export type DocumentoMinOrderByAggregateInput = {
    id?: SortOrder
    vendaId?: SortOrder
    tipo?: SortOrder
    mimeType?: SortOrder
    conteudo?: SortOrder
    tamanhoBytes?: SortOrder
    criadoEm?: SortOrder
  }

  export type DocumentoSumOrderByAggregateInput = {
    id?: SortOrder
    vendaId?: SortOrder
    tamanhoBytes?: SortOrder
  }

  export type BytesWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Bytes | BytesFieldRefInput<$PrismaModel>
    in?: Bytes[] | ListBytesFieldRefInput<$PrismaModel>
    notIn?: Bytes[] | ListBytesFieldRefInput<$PrismaModel>
    not?: NestedBytesWithAggregatesFilter<$PrismaModel> | Bytes
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBytesFilter<$PrismaModel>
    _max?: NestedBytesFilter<$PrismaModel>
  }

  export type FloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type VendaScalarRelationFilter = {
    is?: VendaWhereInput
    isNot?: VendaWhereInput
  }

  export type ItemVendaCountOrderByAggregateInput = {
    id?: SortOrder
    vendaId?: SortOrder
    produtoNome?: SortOrder
    custoProduto?: SortOrder
    valorVenda?: SortOrder
    quantidade?: SortOrder
    subtotal?: SortOrder
  }

  export type ItemVendaAvgOrderByAggregateInput = {
    id?: SortOrder
    vendaId?: SortOrder
    custoProduto?: SortOrder
    valorVenda?: SortOrder
    quantidade?: SortOrder
    subtotal?: SortOrder
  }

  export type ItemVendaMaxOrderByAggregateInput = {
    id?: SortOrder
    vendaId?: SortOrder
    produtoNome?: SortOrder
    custoProduto?: SortOrder
    valorVenda?: SortOrder
    quantidade?: SortOrder
    subtotal?: SortOrder
  }

  export type ItemVendaMinOrderByAggregateInput = {
    id?: SortOrder
    vendaId?: SortOrder
    produtoNome?: SortOrder
    custoProduto?: SortOrder
    valorVenda?: SortOrder
    quantidade?: SortOrder
    subtotal?: SortOrder
  }

  export type ItemVendaSumOrderByAggregateInput = {
    id?: SortOrder
    vendaId?: SortOrder
    custoProduto?: SortOrder
    valorVenda?: SortOrder
    quantidade?: SortOrder
    subtotal?: SortOrder
  }

  export type FloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type ParcelaVencimentoCountOrderByAggregateInput = {
    id?: SortOrder
    vendaId?: SortOrder
    numeroParcela?: SortOrder
    dataVencimento?: SortOrder
    valorParcela?: SortOrder
    paga?: SortOrder
    dataPagamento?: SortOrder
  }

  export type ParcelaVencimentoAvgOrderByAggregateInput = {
    id?: SortOrder
    vendaId?: SortOrder
    numeroParcela?: SortOrder
    valorParcela?: SortOrder
  }

  export type ParcelaVencimentoMaxOrderByAggregateInput = {
    id?: SortOrder
    vendaId?: SortOrder
    numeroParcela?: SortOrder
    dataVencimento?: SortOrder
    valorParcela?: SortOrder
    paga?: SortOrder
    dataPagamento?: SortOrder
  }

  export type ParcelaVencimentoMinOrderByAggregateInput = {
    id?: SortOrder
    vendaId?: SortOrder
    numeroParcela?: SortOrder
    dataVencimento?: SortOrder
    valorParcela?: SortOrder
    paga?: SortOrder
    dataPagamento?: SortOrder
  }

  export type ParcelaVencimentoSumOrderByAggregateInput = {
    id?: SortOrder
    vendaId?: SortOrder
    numeroParcela?: SortOrder
    valorParcela?: SortOrder
  }

  export type ConfigCountOrderByAggregateInput = {
    id?: SortOrder
    modeloContrato?: SortOrder
    modeloReciboVenda?: SortOrder
    logoPath?: SortOrder
    openaiKey?: SortOrder
    geminiKey?: SortOrder
    evolutionApiUrl?: SortOrder
    evolutionApiKey?: SortOrder
    evolutionInstance?: SortOrder
    whatsappAutoEnabled?: SortOrder
  }

  export type ConfigAvgOrderByAggregateInput = {
    id?: SortOrder
    whatsappAutoEnabled?: SortOrder
  }

  export type ConfigMaxOrderByAggregateInput = {
    id?: SortOrder
    modeloContrato?: SortOrder
    modeloReciboVenda?: SortOrder
    logoPath?: SortOrder
    openaiKey?: SortOrder
    geminiKey?: SortOrder
    evolutionApiUrl?: SortOrder
    evolutionApiKey?: SortOrder
    evolutionInstance?: SortOrder
    whatsappAutoEnabled?: SortOrder
  }

  export type ConfigMinOrderByAggregateInput = {
    id?: SortOrder
    modeloContrato?: SortOrder
    modeloReciboVenda?: SortOrder
    logoPath?: SortOrder
    openaiKey?: SortOrder
    geminiKey?: SortOrder
    evolutionApiUrl?: SortOrder
    evolutionApiKey?: SortOrder
    evolutionInstance?: SortOrder
    whatsappAutoEnabled?: SortOrder
  }

  export type ConfigSumOrderByAggregateInput = {
    id?: SortOrder
    whatsappAutoEnabled?: SortOrder
  }

  export type UsuarioCountOrderByAggregateInput = {
    id?: SortOrder
    username?: SortOrder
    password?: SortOrder
    role?: SortOrder
    nomeExibicao?: SortOrder
    email?: SortOrder
    telefone?: SortOrder
    dataNascimento?: SortOrder
    endereco?: SortOrder
    cep?: SortOrder
    metaMensal?: SortOrder
    comissaoPct?: SortOrder
  }

  export type UsuarioAvgOrderByAggregateInput = {
    id?: SortOrder
    metaMensal?: SortOrder
    comissaoPct?: SortOrder
  }

  export type UsuarioMaxOrderByAggregateInput = {
    id?: SortOrder
    username?: SortOrder
    password?: SortOrder
    role?: SortOrder
    nomeExibicao?: SortOrder
    email?: SortOrder
    telefone?: SortOrder
    dataNascimento?: SortOrder
    endereco?: SortOrder
    cep?: SortOrder
    metaMensal?: SortOrder
    comissaoPct?: SortOrder
  }

  export type UsuarioMinOrderByAggregateInput = {
    id?: SortOrder
    username?: SortOrder
    password?: SortOrder
    role?: SortOrder
    nomeExibicao?: SortOrder
    email?: SortOrder
    telefone?: SortOrder
    dataNascimento?: SortOrder
    endereco?: SortOrder
    cep?: SortOrder
    metaMensal?: SortOrder
    comissaoPct?: SortOrder
  }

  export type UsuarioSumOrderByAggregateInput = {
    id?: SortOrder
    metaMensal?: SortOrder
    comissaoPct?: SortOrder
  }

  export type ProdutoListRelationFilter = {
    every?: ProdutoWhereInput
    some?: ProdutoWhereInput
    none?: ProdutoWhereInput
  }

  export type ProdutoOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type FornecedorCountOrderByAggregateInput = {
    id?: SortOrder
    nome?: SortOrder
    telefone?: SortOrder
  }

  export type FornecedorAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type FornecedorMaxOrderByAggregateInput = {
    id?: SortOrder
    nome?: SortOrder
    telefone?: SortOrder
  }

  export type FornecedorMinOrderByAggregateInput = {
    id?: SortOrder
    nome?: SortOrder
    telefone?: SortOrder
  }

  export type FornecedorSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type EmpresaParceiraCountOrderByAggregateInput = {
    id?: SortOrder
    nome?: SortOrder
    responsavelRh?: SortOrder
    telefoneRh?: SortOrder
    emailRh?: SortOrder
  }

  export type EmpresaParceiraAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type EmpresaParceiraMaxOrderByAggregateInput = {
    id?: SortOrder
    nome?: SortOrder
    responsavelRh?: SortOrder
    telefoneRh?: SortOrder
    emailRh?: SortOrder
  }

  export type EmpresaParceiraMinOrderByAggregateInput = {
    id?: SortOrder
    nome?: SortOrder
    responsavelRh?: SortOrder
    telefoneRh?: SortOrder
    emailRh?: SortOrder
  }

  export type EmpresaParceiraSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type PagamentoCountOrderByAggregateInput = {
    id?: SortOrder
    dataPagamento?: SortOrder
    vendedor?: SortOrder
    valor?: SortOrder
    obs?: SortOrder
  }

  export type PagamentoAvgOrderByAggregateInput = {
    id?: SortOrder
    valor?: SortOrder
  }

  export type PagamentoMaxOrderByAggregateInput = {
    id?: SortOrder
    dataPagamento?: SortOrder
    vendedor?: SortOrder
    valor?: SortOrder
    obs?: SortOrder
  }

  export type PagamentoMinOrderByAggregateInput = {
    id?: SortOrder
    dataPagamento?: SortOrder
    vendedor?: SortOrder
    valor?: SortOrder
    obs?: SortOrder
  }

  export type PagamentoSumOrderByAggregateInput = {
    id?: SortOrder
    valor?: SortOrder
  }

  export type AuditLogCountOrderByAggregateInput = {
    id?: SortOrder
    dataHora?: SortOrder
    usuario?: SortOrder
    acao?: SortOrder
    detalhes?: SortOrder
  }

  export type AuditLogAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type AuditLogMaxOrderByAggregateInput = {
    id?: SortOrder
    dataHora?: SortOrder
    usuario?: SortOrder
    acao?: SortOrder
    detalhes?: SortOrder
  }

  export type AuditLogMinOrderByAggregateInput = {
    id?: SortOrder
    dataHora?: SortOrder
    usuario?: SortOrder
    acao?: SortOrder
    detalhes?: SortOrder
  }

  export type AuditLogSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type DespesaCountOrderByAggregateInput = {
    id?: SortOrder
    dataDespesa?: SortOrder
    descricao?: SortOrder
    categoria?: SortOrder
    valor?: SortOrder
    tipo?: SortOrder
  }

  export type DespesaAvgOrderByAggregateInput = {
    id?: SortOrder
    valor?: SortOrder
  }

  export type DespesaMaxOrderByAggregateInput = {
    id?: SortOrder
    dataDespesa?: SortOrder
    descricao?: SortOrder
    categoria?: SortOrder
    valor?: SortOrder
    tipo?: SortOrder
  }

  export type DespesaMinOrderByAggregateInput = {
    id?: SortOrder
    dataDespesa?: SortOrder
    descricao?: SortOrder
    categoria?: SortOrder
    valor?: SortOrder
    tipo?: SortOrder
  }

  export type DespesaSumOrderByAggregateInput = {
    id?: SortOrder
    valor?: SortOrder
  }

  export type AvisoCountOrderByAggregateInput = {
    id?: SortOrder
    dataCriacao?: SortOrder
    mensagem?: SortOrder
    ativo?: SortOrder
  }

  export type AvisoAvgOrderByAggregateInput = {
    id?: SortOrder
    ativo?: SortOrder
  }

  export type AvisoMaxOrderByAggregateInput = {
    id?: SortOrder
    dataCriacao?: SortOrder
    mensagem?: SortOrder
    ativo?: SortOrder
  }

  export type AvisoMinOrderByAggregateInput = {
    id?: SortOrder
    dataCriacao?: SortOrder
    mensagem?: SortOrder
    ativo?: SortOrder
  }

  export type AvisoSumOrderByAggregateInput = {
    id?: SortOrder
    ativo?: SortOrder
  }

  export type VendaCreateNestedManyWithoutClienteInput = {
    create?: XOR<VendaCreateWithoutClienteInput, VendaUncheckedCreateWithoutClienteInput> | VendaCreateWithoutClienteInput[] | VendaUncheckedCreateWithoutClienteInput[]
    connectOrCreate?: VendaCreateOrConnectWithoutClienteInput | VendaCreateOrConnectWithoutClienteInput[]
    createMany?: VendaCreateManyClienteInputEnvelope
    connect?: VendaWhereUniqueInput | VendaWhereUniqueInput[]
  }

  export type VendaUncheckedCreateNestedManyWithoutClienteInput = {
    create?: XOR<VendaCreateWithoutClienteInput, VendaUncheckedCreateWithoutClienteInput> | VendaCreateWithoutClienteInput[] | VendaUncheckedCreateWithoutClienteInput[]
    connectOrCreate?: VendaCreateOrConnectWithoutClienteInput | VendaCreateOrConnectWithoutClienteInput[]
    createMany?: VendaCreateManyClienteInputEnvelope
    connect?: VendaWhereUniqueInput | VendaWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableFloatFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type VendaUpdateManyWithoutClienteNestedInput = {
    create?: XOR<VendaCreateWithoutClienteInput, VendaUncheckedCreateWithoutClienteInput> | VendaCreateWithoutClienteInput[] | VendaUncheckedCreateWithoutClienteInput[]
    connectOrCreate?: VendaCreateOrConnectWithoutClienteInput | VendaCreateOrConnectWithoutClienteInput[]
    upsert?: VendaUpsertWithWhereUniqueWithoutClienteInput | VendaUpsertWithWhereUniqueWithoutClienteInput[]
    createMany?: VendaCreateManyClienteInputEnvelope
    set?: VendaWhereUniqueInput | VendaWhereUniqueInput[]
    disconnect?: VendaWhereUniqueInput | VendaWhereUniqueInput[]
    delete?: VendaWhereUniqueInput | VendaWhereUniqueInput[]
    connect?: VendaWhereUniqueInput | VendaWhereUniqueInput[]
    update?: VendaUpdateWithWhereUniqueWithoutClienteInput | VendaUpdateWithWhereUniqueWithoutClienteInput[]
    updateMany?: VendaUpdateManyWithWhereWithoutClienteInput | VendaUpdateManyWithWhereWithoutClienteInput[]
    deleteMany?: VendaScalarWhereInput | VendaScalarWhereInput[]
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type VendaUncheckedUpdateManyWithoutClienteNestedInput = {
    create?: XOR<VendaCreateWithoutClienteInput, VendaUncheckedCreateWithoutClienteInput> | VendaCreateWithoutClienteInput[] | VendaUncheckedCreateWithoutClienteInput[]
    connectOrCreate?: VendaCreateOrConnectWithoutClienteInput | VendaCreateOrConnectWithoutClienteInput[]
    upsert?: VendaUpsertWithWhereUniqueWithoutClienteInput | VendaUpsertWithWhereUniqueWithoutClienteInput[]
    createMany?: VendaCreateManyClienteInputEnvelope
    set?: VendaWhereUniqueInput | VendaWhereUniqueInput[]
    disconnect?: VendaWhereUniqueInput | VendaWhereUniqueInput[]
    delete?: VendaWhereUniqueInput | VendaWhereUniqueInput[]
    connect?: VendaWhereUniqueInput | VendaWhereUniqueInput[]
    update?: VendaUpdateWithWhereUniqueWithoutClienteInput | VendaUpdateWithWhereUniqueWithoutClienteInput[]
    updateMany?: VendaUpdateManyWithWhereWithoutClienteInput | VendaUpdateManyWithWhereWithoutClienteInput[]
    deleteMany?: VendaScalarWhereInput | VendaScalarWhereInput[]
  }

  export type FornecedorCreateNestedOneWithoutProdutosInput = {
    create?: XOR<FornecedorCreateWithoutProdutosInput, FornecedorUncheckedCreateWithoutProdutosInput>
    connectOrCreate?: FornecedorCreateOrConnectWithoutProdutosInput
    connect?: FornecedorWhereUniqueInput
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type FornecedorUpdateOneWithoutProdutosNestedInput = {
    create?: XOR<FornecedorCreateWithoutProdutosInput, FornecedorUncheckedCreateWithoutProdutosInput>
    connectOrCreate?: FornecedorCreateOrConnectWithoutProdutosInput
    upsert?: FornecedorUpsertWithoutProdutosInput
    disconnect?: FornecedorWhereInput | boolean
    delete?: FornecedorWhereInput | boolean
    connect?: FornecedorWhereUniqueInput
    update?: XOR<XOR<FornecedorUpdateToOneWithWhereWithoutProdutosInput, FornecedorUpdateWithoutProdutosInput>, FornecedorUncheckedUpdateWithoutProdutosInput>
  }

  export type ClienteCreateNestedOneWithoutVendasInput = {
    create?: XOR<ClienteCreateWithoutVendasInput, ClienteUncheckedCreateWithoutVendasInput>
    connectOrCreate?: ClienteCreateOrConnectWithoutVendasInput
    connect?: ClienteWhereUniqueInput
  }

  export type ItemVendaCreateNestedManyWithoutVendaInput = {
    create?: XOR<ItemVendaCreateWithoutVendaInput, ItemVendaUncheckedCreateWithoutVendaInput> | ItemVendaCreateWithoutVendaInput[] | ItemVendaUncheckedCreateWithoutVendaInput[]
    connectOrCreate?: ItemVendaCreateOrConnectWithoutVendaInput | ItemVendaCreateOrConnectWithoutVendaInput[]
    createMany?: ItemVendaCreateManyVendaInputEnvelope
    connect?: ItemVendaWhereUniqueInput | ItemVendaWhereUniqueInput[]
  }

  export type ParcelaVencimentoCreateNestedManyWithoutVendaInput = {
    create?: XOR<ParcelaVencimentoCreateWithoutVendaInput, ParcelaVencimentoUncheckedCreateWithoutVendaInput> | ParcelaVencimentoCreateWithoutVendaInput[] | ParcelaVencimentoUncheckedCreateWithoutVendaInput[]
    connectOrCreate?: ParcelaVencimentoCreateOrConnectWithoutVendaInput | ParcelaVencimentoCreateOrConnectWithoutVendaInput[]
    createMany?: ParcelaVencimentoCreateManyVendaInputEnvelope
    connect?: ParcelaVencimentoWhereUniqueInput | ParcelaVencimentoWhereUniqueInput[]
  }

  export type DocumentoCreateNestedManyWithoutVendaInput = {
    create?: XOR<DocumentoCreateWithoutVendaInput, DocumentoUncheckedCreateWithoutVendaInput> | DocumentoCreateWithoutVendaInput[] | DocumentoUncheckedCreateWithoutVendaInput[]
    connectOrCreate?: DocumentoCreateOrConnectWithoutVendaInput | DocumentoCreateOrConnectWithoutVendaInput[]
    createMany?: DocumentoCreateManyVendaInputEnvelope
    connect?: DocumentoWhereUniqueInput | DocumentoWhereUniqueInput[]
  }

  export type ItemVendaUncheckedCreateNestedManyWithoutVendaInput = {
    create?: XOR<ItemVendaCreateWithoutVendaInput, ItemVendaUncheckedCreateWithoutVendaInput> | ItemVendaCreateWithoutVendaInput[] | ItemVendaUncheckedCreateWithoutVendaInput[]
    connectOrCreate?: ItemVendaCreateOrConnectWithoutVendaInput | ItemVendaCreateOrConnectWithoutVendaInput[]
    createMany?: ItemVendaCreateManyVendaInputEnvelope
    connect?: ItemVendaWhereUniqueInput | ItemVendaWhereUniqueInput[]
  }

  export type ParcelaVencimentoUncheckedCreateNestedManyWithoutVendaInput = {
    create?: XOR<ParcelaVencimentoCreateWithoutVendaInput, ParcelaVencimentoUncheckedCreateWithoutVendaInput> | ParcelaVencimentoCreateWithoutVendaInput[] | ParcelaVencimentoUncheckedCreateWithoutVendaInput[]
    connectOrCreate?: ParcelaVencimentoCreateOrConnectWithoutVendaInput | ParcelaVencimentoCreateOrConnectWithoutVendaInput[]
    createMany?: ParcelaVencimentoCreateManyVendaInputEnvelope
    connect?: ParcelaVencimentoWhereUniqueInput | ParcelaVencimentoWhereUniqueInput[]
  }

  export type DocumentoUncheckedCreateNestedManyWithoutVendaInput = {
    create?: XOR<DocumentoCreateWithoutVendaInput, DocumentoUncheckedCreateWithoutVendaInput> | DocumentoCreateWithoutVendaInput[] | DocumentoUncheckedCreateWithoutVendaInput[]
    connectOrCreate?: DocumentoCreateOrConnectWithoutVendaInput | DocumentoCreateOrConnectWithoutVendaInput[]
    createMany?: DocumentoCreateManyVendaInputEnvelope
    connect?: DocumentoWhereUniqueInput | DocumentoWhereUniqueInput[]
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type ClienteUpdateOneWithoutVendasNestedInput = {
    create?: XOR<ClienteCreateWithoutVendasInput, ClienteUncheckedCreateWithoutVendasInput>
    connectOrCreate?: ClienteCreateOrConnectWithoutVendasInput
    upsert?: ClienteUpsertWithoutVendasInput
    disconnect?: ClienteWhereInput | boolean
    delete?: ClienteWhereInput | boolean
    connect?: ClienteWhereUniqueInput
    update?: XOR<XOR<ClienteUpdateToOneWithWhereWithoutVendasInput, ClienteUpdateWithoutVendasInput>, ClienteUncheckedUpdateWithoutVendasInput>
  }

  export type ItemVendaUpdateManyWithoutVendaNestedInput = {
    create?: XOR<ItemVendaCreateWithoutVendaInput, ItemVendaUncheckedCreateWithoutVendaInput> | ItemVendaCreateWithoutVendaInput[] | ItemVendaUncheckedCreateWithoutVendaInput[]
    connectOrCreate?: ItemVendaCreateOrConnectWithoutVendaInput | ItemVendaCreateOrConnectWithoutVendaInput[]
    upsert?: ItemVendaUpsertWithWhereUniqueWithoutVendaInput | ItemVendaUpsertWithWhereUniqueWithoutVendaInput[]
    createMany?: ItemVendaCreateManyVendaInputEnvelope
    set?: ItemVendaWhereUniqueInput | ItemVendaWhereUniqueInput[]
    disconnect?: ItemVendaWhereUniqueInput | ItemVendaWhereUniqueInput[]
    delete?: ItemVendaWhereUniqueInput | ItemVendaWhereUniqueInput[]
    connect?: ItemVendaWhereUniqueInput | ItemVendaWhereUniqueInput[]
    update?: ItemVendaUpdateWithWhereUniqueWithoutVendaInput | ItemVendaUpdateWithWhereUniqueWithoutVendaInput[]
    updateMany?: ItemVendaUpdateManyWithWhereWithoutVendaInput | ItemVendaUpdateManyWithWhereWithoutVendaInput[]
    deleteMany?: ItemVendaScalarWhereInput | ItemVendaScalarWhereInput[]
  }

  export type ParcelaVencimentoUpdateManyWithoutVendaNestedInput = {
    create?: XOR<ParcelaVencimentoCreateWithoutVendaInput, ParcelaVencimentoUncheckedCreateWithoutVendaInput> | ParcelaVencimentoCreateWithoutVendaInput[] | ParcelaVencimentoUncheckedCreateWithoutVendaInput[]
    connectOrCreate?: ParcelaVencimentoCreateOrConnectWithoutVendaInput | ParcelaVencimentoCreateOrConnectWithoutVendaInput[]
    upsert?: ParcelaVencimentoUpsertWithWhereUniqueWithoutVendaInput | ParcelaVencimentoUpsertWithWhereUniqueWithoutVendaInput[]
    createMany?: ParcelaVencimentoCreateManyVendaInputEnvelope
    set?: ParcelaVencimentoWhereUniqueInput | ParcelaVencimentoWhereUniqueInput[]
    disconnect?: ParcelaVencimentoWhereUniqueInput | ParcelaVencimentoWhereUniqueInput[]
    delete?: ParcelaVencimentoWhereUniqueInput | ParcelaVencimentoWhereUniqueInput[]
    connect?: ParcelaVencimentoWhereUniqueInput | ParcelaVencimentoWhereUniqueInput[]
    update?: ParcelaVencimentoUpdateWithWhereUniqueWithoutVendaInput | ParcelaVencimentoUpdateWithWhereUniqueWithoutVendaInput[]
    updateMany?: ParcelaVencimentoUpdateManyWithWhereWithoutVendaInput | ParcelaVencimentoUpdateManyWithWhereWithoutVendaInput[]
    deleteMany?: ParcelaVencimentoScalarWhereInput | ParcelaVencimentoScalarWhereInput[]
  }

  export type DocumentoUpdateManyWithoutVendaNestedInput = {
    create?: XOR<DocumentoCreateWithoutVendaInput, DocumentoUncheckedCreateWithoutVendaInput> | DocumentoCreateWithoutVendaInput[] | DocumentoUncheckedCreateWithoutVendaInput[]
    connectOrCreate?: DocumentoCreateOrConnectWithoutVendaInput | DocumentoCreateOrConnectWithoutVendaInput[]
    upsert?: DocumentoUpsertWithWhereUniqueWithoutVendaInput | DocumentoUpsertWithWhereUniqueWithoutVendaInput[]
    createMany?: DocumentoCreateManyVendaInputEnvelope
    set?: DocumentoWhereUniqueInput | DocumentoWhereUniqueInput[]
    disconnect?: DocumentoWhereUniqueInput | DocumentoWhereUniqueInput[]
    delete?: DocumentoWhereUniqueInput | DocumentoWhereUniqueInput[]
    connect?: DocumentoWhereUniqueInput | DocumentoWhereUniqueInput[]
    update?: DocumentoUpdateWithWhereUniqueWithoutVendaInput | DocumentoUpdateWithWhereUniqueWithoutVendaInput[]
    updateMany?: DocumentoUpdateManyWithWhereWithoutVendaInput | DocumentoUpdateManyWithWhereWithoutVendaInput[]
    deleteMany?: DocumentoScalarWhereInput | DocumentoScalarWhereInput[]
  }

  export type ItemVendaUncheckedUpdateManyWithoutVendaNestedInput = {
    create?: XOR<ItemVendaCreateWithoutVendaInput, ItemVendaUncheckedCreateWithoutVendaInput> | ItemVendaCreateWithoutVendaInput[] | ItemVendaUncheckedCreateWithoutVendaInput[]
    connectOrCreate?: ItemVendaCreateOrConnectWithoutVendaInput | ItemVendaCreateOrConnectWithoutVendaInput[]
    upsert?: ItemVendaUpsertWithWhereUniqueWithoutVendaInput | ItemVendaUpsertWithWhereUniqueWithoutVendaInput[]
    createMany?: ItemVendaCreateManyVendaInputEnvelope
    set?: ItemVendaWhereUniqueInput | ItemVendaWhereUniqueInput[]
    disconnect?: ItemVendaWhereUniqueInput | ItemVendaWhereUniqueInput[]
    delete?: ItemVendaWhereUniqueInput | ItemVendaWhereUniqueInput[]
    connect?: ItemVendaWhereUniqueInput | ItemVendaWhereUniqueInput[]
    update?: ItemVendaUpdateWithWhereUniqueWithoutVendaInput | ItemVendaUpdateWithWhereUniqueWithoutVendaInput[]
    updateMany?: ItemVendaUpdateManyWithWhereWithoutVendaInput | ItemVendaUpdateManyWithWhereWithoutVendaInput[]
    deleteMany?: ItemVendaScalarWhereInput | ItemVendaScalarWhereInput[]
  }

  export type ParcelaVencimentoUncheckedUpdateManyWithoutVendaNestedInput = {
    create?: XOR<ParcelaVencimentoCreateWithoutVendaInput, ParcelaVencimentoUncheckedCreateWithoutVendaInput> | ParcelaVencimentoCreateWithoutVendaInput[] | ParcelaVencimentoUncheckedCreateWithoutVendaInput[]
    connectOrCreate?: ParcelaVencimentoCreateOrConnectWithoutVendaInput | ParcelaVencimentoCreateOrConnectWithoutVendaInput[]
    upsert?: ParcelaVencimentoUpsertWithWhereUniqueWithoutVendaInput | ParcelaVencimentoUpsertWithWhereUniqueWithoutVendaInput[]
    createMany?: ParcelaVencimentoCreateManyVendaInputEnvelope
    set?: ParcelaVencimentoWhereUniqueInput | ParcelaVencimentoWhereUniqueInput[]
    disconnect?: ParcelaVencimentoWhereUniqueInput | ParcelaVencimentoWhereUniqueInput[]
    delete?: ParcelaVencimentoWhereUniqueInput | ParcelaVencimentoWhereUniqueInput[]
    connect?: ParcelaVencimentoWhereUniqueInput | ParcelaVencimentoWhereUniqueInput[]
    update?: ParcelaVencimentoUpdateWithWhereUniqueWithoutVendaInput | ParcelaVencimentoUpdateWithWhereUniqueWithoutVendaInput[]
    updateMany?: ParcelaVencimentoUpdateManyWithWhereWithoutVendaInput | ParcelaVencimentoUpdateManyWithWhereWithoutVendaInput[]
    deleteMany?: ParcelaVencimentoScalarWhereInput | ParcelaVencimentoScalarWhereInput[]
  }

  export type DocumentoUncheckedUpdateManyWithoutVendaNestedInput = {
    create?: XOR<DocumentoCreateWithoutVendaInput, DocumentoUncheckedCreateWithoutVendaInput> | DocumentoCreateWithoutVendaInput[] | DocumentoUncheckedCreateWithoutVendaInput[]
    connectOrCreate?: DocumentoCreateOrConnectWithoutVendaInput | DocumentoCreateOrConnectWithoutVendaInput[]
    upsert?: DocumentoUpsertWithWhereUniqueWithoutVendaInput | DocumentoUpsertWithWhereUniqueWithoutVendaInput[]
    createMany?: DocumentoCreateManyVendaInputEnvelope
    set?: DocumentoWhereUniqueInput | DocumentoWhereUniqueInput[]
    disconnect?: DocumentoWhereUniqueInput | DocumentoWhereUniqueInput[]
    delete?: DocumentoWhereUniqueInput | DocumentoWhereUniqueInput[]
    connect?: DocumentoWhereUniqueInput | DocumentoWhereUniqueInput[]
    update?: DocumentoUpdateWithWhereUniqueWithoutVendaInput | DocumentoUpdateWithWhereUniqueWithoutVendaInput[]
    updateMany?: DocumentoUpdateManyWithWhereWithoutVendaInput | DocumentoUpdateManyWithWhereWithoutVendaInput[]
    deleteMany?: DocumentoScalarWhereInput | DocumentoScalarWhereInput[]
  }

  export type VendaCreateNestedOneWithoutDocumentosInput = {
    create?: XOR<VendaCreateWithoutDocumentosInput, VendaUncheckedCreateWithoutDocumentosInput>
    connectOrCreate?: VendaCreateOrConnectWithoutDocumentosInput
    connect?: VendaWhereUniqueInput
  }

  export type BytesFieldUpdateOperationsInput = {
    set?: Bytes
  }

  export type VendaUpdateOneWithoutDocumentosNestedInput = {
    create?: XOR<VendaCreateWithoutDocumentosInput, VendaUncheckedCreateWithoutDocumentosInput>
    connectOrCreate?: VendaCreateOrConnectWithoutDocumentosInput
    upsert?: VendaUpsertWithoutDocumentosInput
    disconnect?: VendaWhereInput | boolean
    delete?: VendaWhereInput | boolean
    connect?: VendaWhereUniqueInput
    update?: XOR<XOR<VendaUpdateToOneWithWhereWithoutDocumentosInput, VendaUpdateWithoutDocumentosInput>, VendaUncheckedUpdateWithoutDocumentosInput>
  }

  export type VendaCreateNestedOneWithoutItensInput = {
    create?: XOR<VendaCreateWithoutItensInput, VendaUncheckedCreateWithoutItensInput>
    connectOrCreate?: VendaCreateOrConnectWithoutItensInput
    connect?: VendaWhereUniqueInput
  }

  export type FloatFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type VendaUpdateOneRequiredWithoutItensNestedInput = {
    create?: XOR<VendaCreateWithoutItensInput, VendaUncheckedCreateWithoutItensInput>
    connectOrCreate?: VendaCreateOrConnectWithoutItensInput
    upsert?: VendaUpsertWithoutItensInput
    connect?: VendaWhereUniqueInput
    update?: XOR<XOR<VendaUpdateToOneWithWhereWithoutItensInput, VendaUpdateWithoutItensInput>, VendaUncheckedUpdateWithoutItensInput>
  }

  export type VendaCreateNestedOneWithoutParcelasVencimentoInput = {
    create?: XOR<VendaCreateWithoutParcelasVencimentoInput, VendaUncheckedCreateWithoutParcelasVencimentoInput>
    connectOrCreate?: VendaCreateOrConnectWithoutParcelasVencimentoInput
    connect?: VendaWhereUniqueInput
  }

  export type VendaUpdateOneRequiredWithoutParcelasVencimentoNestedInput = {
    create?: XOR<VendaCreateWithoutParcelasVencimentoInput, VendaUncheckedCreateWithoutParcelasVencimentoInput>
    connectOrCreate?: VendaCreateOrConnectWithoutParcelasVencimentoInput
    upsert?: VendaUpsertWithoutParcelasVencimentoInput
    connect?: VendaWhereUniqueInput
    update?: XOR<XOR<VendaUpdateToOneWithWhereWithoutParcelasVencimentoInput, VendaUpdateWithoutParcelasVencimentoInput>, VendaUncheckedUpdateWithoutParcelasVencimentoInput>
  }

  export type ProdutoCreateNestedManyWithoutFornecedorInput = {
    create?: XOR<ProdutoCreateWithoutFornecedorInput, ProdutoUncheckedCreateWithoutFornecedorInput> | ProdutoCreateWithoutFornecedorInput[] | ProdutoUncheckedCreateWithoutFornecedorInput[]
    connectOrCreate?: ProdutoCreateOrConnectWithoutFornecedorInput | ProdutoCreateOrConnectWithoutFornecedorInput[]
    createMany?: ProdutoCreateManyFornecedorInputEnvelope
    connect?: ProdutoWhereUniqueInput | ProdutoWhereUniqueInput[]
  }

  export type ProdutoUncheckedCreateNestedManyWithoutFornecedorInput = {
    create?: XOR<ProdutoCreateWithoutFornecedorInput, ProdutoUncheckedCreateWithoutFornecedorInput> | ProdutoCreateWithoutFornecedorInput[] | ProdutoUncheckedCreateWithoutFornecedorInput[]
    connectOrCreate?: ProdutoCreateOrConnectWithoutFornecedorInput | ProdutoCreateOrConnectWithoutFornecedorInput[]
    createMany?: ProdutoCreateManyFornecedorInputEnvelope
    connect?: ProdutoWhereUniqueInput | ProdutoWhereUniqueInput[]
  }

  export type ProdutoUpdateManyWithoutFornecedorNestedInput = {
    create?: XOR<ProdutoCreateWithoutFornecedorInput, ProdutoUncheckedCreateWithoutFornecedorInput> | ProdutoCreateWithoutFornecedorInput[] | ProdutoUncheckedCreateWithoutFornecedorInput[]
    connectOrCreate?: ProdutoCreateOrConnectWithoutFornecedorInput | ProdutoCreateOrConnectWithoutFornecedorInput[]
    upsert?: ProdutoUpsertWithWhereUniqueWithoutFornecedorInput | ProdutoUpsertWithWhereUniqueWithoutFornecedorInput[]
    createMany?: ProdutoCreateManyFornecedorInputEnvelope
    set?: ProdutoWhereUniqueInput | ProdutoWhereUniqueInput[]
    disconnect?: ProdutoWhereUniqueInput | ProdutoWhereUniqueInput[]
    delete?: ProdutoWhereUniqueInput | ProdutoWhereUniqueInput[]
    connect?: ProdutoWhereUniqueInput | ProdutoWhereUniqueInput[]
    update?: ProdutoUpdateWithWhereUniqueWithoutFornecedorInput | ProdutoUpdateWithWhereUniqueWithoutFornecedorInput[]
    updateMany?: ProdutoUpdateManyWithWhereWithoutFornecedorInput | ProdutoUpdateManyWithWhereWithoutFornecedorInput[]
    deleteMany?: ProdutoScalarWhereInput | ProdutoScalarWhereInput[]
  }

  export type ProdutoUncheckedUpdateManyWithoutFornecedorNestedInput = {
    create?: XOR<ProdutoCreateWithoutFornecedorInput, ProdutoUncheckedCreateWithoutFornecedorInput> | ProdutoCreateWithoutFornecedorInput[] | ProdutoUncheckedCreateWithoutFornecedorInput[]
    connectOrCreate?: ProdutoCreateOrConnectWithoutFornecedorInput | ProdutoCreateOrConnectWithoutFornecedorInput[]
    upsert?: ProdutoUpsertWithWhereUniqueWithoutFornecedorInput | ProdutoUpsertWithWhereUniqueWithoutFornecedorInput[]
    createMany?: ProdutoCreateManyFornecedorInputEnvelope
    set?: ProdutoWhereUniqueInput | ProdutoWhereUniqueInput[]
    disconnect?: ProdutoWhereUniqueInput | ProdutoWhereUniqueInput[]
    delete?: ProdutoWhereUniqueInput | ProdutoWhereUniqueInput[]
    connect?: ProdutoWhereUniqueInput | ProdutoWhereUniqueInput[]
    update?: ProdutoUpdateWithWhereUniqueWithoutFornecedorInput | ProdutoUpdateWithWhereUniqueWithoutFornecedorInput[]
    updateMany?: ProdutoUpdateManyWithWhereWithoutFornecedorInput | ProdutoUpdateManyWithWhereWithoutFornecedorInput[]
    deleteMany?: ProdutoScalarWhereInput | ProdutoScalarWhereInput[]
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedFloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedUuidNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidNullableFilter<$PrismaModel> | string | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedUuidNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedBytesFilter<$PrismaModel = never> = {
    equals?: Bytes | BytesFieldRefInput<$PrismaModel>
    in?: Bytes[] | ListBytesFieldRefInput<$PrismaModel>
    notIn?: Bytes[] | ListBytesFieldRefInput<$PrismaModel>
    not?: NestedBytesFilter<$PrismaModel> | Bytes
  }

  export type NestedBytesWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Bytes | BytesFieldRefInput<$PrismaModel>
    in?: Bytes[] | ListBytesFieldRefInput<$PrismaModel>
    notIn?: Bytes[] | ListBytesFieldRefInput<$PrismaModel>
    not?: NestedBytesWithAggregatesFilter<$PrismaModel> | Bytes
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBytesFilter<$PrismaModel>
    _max?: NestedBytesFilter<$PrismaModel>
  }

  export type NestedFloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type VendaCreateWithoutClienteInput = {
    uuid?: string | null
    dataVenda: Date | string
    vendedor?: string | null
    produtoNome?: string | null
    custoProduto?: number | null
    quantidade?: number | null
    valorVenda?: number | null
    valorFrete?: number | null
    custoEnvio?: number | null
    parcelas?: number | null
    valorParcela?: number | null
    taxaFinanceiraValor?: number | null
    lucroLiquido?: number | null
    antecipada?: number | null
    excedeuLimite?: number | null
    temNota?: boolean
    taxaNota?: number | null
    comprovantePdf?: string | null
    descontoEmFolha?: boolean
    assinaturaToken?: string | null
    assinaturaStatus?: string | null
    assinaturaEm?: Date | string | null
    boleto?: boolean
    asaasPaymentId?: string | null
    boletoUrl?: string | null
    itens?: ItemVendaCreateNestedManyWithoutVendaInput
    parcelasVencimento?: ParcelaVencimentoCreateNestedManyWithoutVendaInput
    documentos?: DocumentoCreateNestedManyWithoutVendaInput
  }

  export type VendaUncheckedCreateWithoutClienteInput = {
    id?: number
    uuid?: string | null
    dataVenda: Date | string
    vendedor?: string | null
    produtoNome?: string | null
    custoProduto?: number | null
    quantidade?: number | null
    valorVenda?: number | null
    valorFrete?: number | null
    custoEnvio?: number | null
    parcelas?: number | null
    valorParcela?: number | null
    taxaFinanceiraValor?: number | null
    lucroLiquido?: number | null
    antecipada?: number | null
    excedeuLimite?: number | null
    temNota?: boolean
    taxaNota?: number | null
    comprovantePdf?: string | null
    descontoEmFolha?: boolean
    assinaturaToken?: string | null
    assinaturaStatus?: string | null
    assinaturaEm?: Date | string | null
    boleto?: boolean
    asaasPaymentId?: string | null
    boletoUrl?: string | null
    itens?: ItemVendaUncheckedCreateNestedManyWithoutVendaInput
    parcelasVencimento?: ParcelaVencimentoUncheckedCreateNestedManyWithoutVendaInput
    documentos?: DocumentoUncheckedCreateNestedManyWithoutVendaInput
  }

  export type VendaCreateOrConnectWithoutClienteInput = {
    where: VendaWhereUniqueInput
    create: XOR<VendaCreateWithoutClienteInput, VendaUncheckedCreateWithoutClienteInput>
  }

  export type VendaCreateManyClienteInputEnvelope = {
    data: VendaCreateManyClienteInput | VendaCreateManyClienteInput[]
    skipDuplicates?: boolean
  }

  export type VendaUpsertWithWhereUniqueWithoutClienteInput = {
    where: VendaWhereUniqueInput
    update: XOR<VendaUpdateWithoutClienteInput, VendaUncheckedUpdateWithoutClienteInput>
    create: XOR<VendaCreateWithoutClienteInput, VendaUncheckedCreateWithoutClienteInput>
  }

  export type VendaUpdateWithWhereUniqueWithoutClienteInput = {
    where: VendaWhereUniqueInput
    data: XOR<VendaUpdateWithoutClienteInput, VendaUncheckedUpdateWithoutClienteInput>
  }

  export type VendaUpdateManyWithWhereWithoutClienteInput = {
    where: VendaScalarWhereInput
    data: XOR<VendaUpdateManyMutationInput, VendaUncheckedUpdateManyWithoutClienteInput>
  }

  export type VendaScalarWhereInput = {
    AND?: VendaScalarWhereInput | VendaScalarWhereInput[]
    OR?: VendaScalarWhereInput[]
    NOT?: VendaScalarWhereInput | VendaScalarWhereInput[]
    id?: IntFilter<"Venda"> | number
    uuid?: UuidNullableFilter<"Venda"> | string | null
    dataVenda?: DateTimeFilter<"Venda"> | Date | string
    vendedor?: StringNullableFilter<"Venda"> | string | null
    clienteId?: IntNullableFilter<"Venda"> | number | null
    produtoNome?: StringNullableFilter<"Venda"> | string | null
    custoProduto?: FloatNullableFilter<"Venda"> | number | null
    quantidade?: IntNullableFilter<"Venda"> | number | null
    valorVenda?: FloatNullableFilter<"Venda"> | number | null
    valorFrete?: FloatNullableFilter<"Venda"> | number | null
    custoEnvio?: FloatNullableFilter<"Venda"> | number | null
    parcelas?: IntNullableFilter<"Venda"> | number | null
    valorParcela?: FloatNullableFilter<"Venda"> | number | null
    taxaFinanceiraValor?: FloatNullableFilter<"Venda"> | number | null
    lucroLiquido?: FloatNullableFilter<"Venda"> | number | null
    antecipada?: IntNullableFilter<"Venda"> | number | null
    excedeuLimite?: IntNullableFilter<"Venda"> | number | null
    temNota?: BoolFilter<"Venda"> | boolean
    taxaNota?: FloatNullableFilter<"Venda"> | number | null
    comprovantePdf?: StringNullableFilter<"Venda"> | string | null
    descontoEmFolha?: BoolFilter<"Venda"> | boolean
    assinaturaToken?: StringNullableFilter<"Venda"> | string | null
    assinaturaStatus?: StringNullableFilter<"Venda"> | string | null
    assinaturaEm?: DateTimeNullableFilter<"Venda"> | Date | string | null
    boleto?: BoolFilter<"Venda"> | boolean
    asaasPaymentId?: StringNullableFilter<"Venda"> | string | null
    boletoUrl?: StringNullableFilter<"Venda"> | string | null
  }

  export type FornecedorCreateWithoutProdutosInput = {
    nome: string
    telefone?: string | null
  }

  export type FornecedorUncheckedCreateWithoutProdutosInput = {
    id?: number
    nome: string
    telefone?: string | null
  }

  export type FornecedorCreateOrConnectWithoutProdutosInput = {
    where: FornecedorWhereUniqueInput
    create: XOR<FornecedorCreateWithoutProdutosInput, FornecedorUncheckedCreateWithoutProdutosInput>
  }

  export type FornecedorUpsertWithoutProdutosInput = {
    update: XOR<FornecedorUpdateWithoutProdutosInput, FornecedorUncheckedUpdateWithoutProdutosInput>
    create: XOR<FornecedorCreateWithoutProdutosInput, FornecedorUncheckedCreateWithoutProdutosInput>
    where?: FornecedorWhereInput
  }

  export type FornecedorUpdateToOneWithWhereWithoutProdutosInput = {
    where?: FornecedorWhereInput
    data: XOR<FornecedorUpdateWithoutProdutosInput, FornecedorUncheckedUpdateWithoutProdutosInput>
  }

  export type FornecedorUpdateWithoutProdutosInput = {
    nome?: StringFieldUpdateOperationsInput | string
    telefone?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type FornecedorUncheckedUpdateWithoutProdutosInput = {
    id?: IntFieldUpdateOperationsInput | number
    nome?: StringFieldUpdateOperationsInput | string
    telefone?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ClienteCreateWithoutVendasInput = {
    nome: string
    renda?: number | null
    empresa?: string | null
    matricula?: string | null
    telefone?: string | null
    cpf?: string | null
    cnpj?: string | null
    tipo?: string | null
    dataNascimento?: Date | string | null
    cep?: string | null
    endereco?: string | null
    email?: string | null
    asaasCustomerId?: string | null
  }

  export type ClienteUncheckedCreateWithoutVendasInput = {
    id?: number
    nome: string
    renda?: number | null
    empresa?: string | null
    matricula?: string | null
    telefone?: string | null
    cpf?: string | null
    cnpj?: string | null
    tipo?: string | null
    dataNascimento?: Date | string | null
    cep?: string | null
    endereco?: string | null
    email?: string | null
    asaasCustomerId?: string | null
  }

  export type ClienteCreateOrConnectWithoutVendasInput = {
    where: ClienteWhereUniqueInput
    create: XOR<ClienteCreateWithoutVendasInput, ClienteUncheckedCreateWithoutVendasInput>
  }

  export type ItemVendaCreateWithoutVendaInput = {
    produtoNome: string
    custoProduto: number
    valorVenda: number
    quantidade?: number
    subtotal: number
  }

  export type ItemVendaUncheckedCreateWithoutVendaInput = {
    id?: number
    produtoNome: string
    custoProduto: number
    valorVenda: number
    quantidade?: number
    subtotal: number
  }

  export type ItemVendaCreateOrConnectWithoutVendaInput = {
    where: ItemVendaWhereUniqueInput
    create: XOR<ItemVendaCreateWithoutVendaInput, ItemVendaUncheckedCreateWithoutVendaInput>
  }

  export type ItemVendaCreateManyVendaInputEnvelope = {
    data: ItemVendaCreateManyVendaInput | ItemVendaCreateManyVendaInput[]
    skipDuplicates?: boolean
  }

  export type ParcelaVencimentoCreateWithoutVendaInput = {
    numeroParcela: number
    dataVencimento: Date | string
    valorParcela: number
    paga?: boolean
    dataPagamento?: Date | string | null
  }

  export type ParcelaVencimentoUncheckedCreateWithoutVendaInput = {
    id?: number
    numeroParcela: number
    dataVencimento: Date | string
    valorParcela: number
    paga?: boolean
    dataPagamento?: Date | string | null
  }

  export type ParcelaVencimentoCreateOrConnectWithoutVendaInput = {
    where: ParcelaVencimentoWhereUniqueInput
    create: XOR<ParcelaVencimentoCreateWithoutVendaInput, ParcelaVencimentoUncheckedCreateWithoutVendaInput>
  }

  export type ParcelaVencimentoCreateManyVendaInputEnvelope = {
    data: ParcelaVencimentoCreateManyVendaInput | ParcelaVencimentoCreateManyVendaInput[]
    skipDuplicates?: boolean
  }

  export type DocumentoCreateWithoutVendaInput = {
    tipo: string
    mimeType?: string
    conteudo: Bytes
    tamanhoBytes: number
    criadoEm?: Date | string
  }

  export type DocumentoUncheckedCreateWithoutVendaInput = {
    id?: number
    tipo: string
    mimeType?: string
    conteudo: Bytes
    tamanhoBytes: number
    criadoEm?: Date | string
  }

  export type DocumentoCreateOrConnectWithoutVendaInput = {
    where: DocumentoWhereUniqueInput
    create: XOR<DocumentoCreateWithoutVendaInput, DocumentoUncheckedCreateWithoutVendaInput>
  }

  export type DocumentoCreateManyVendaInputEnvelope = {
    data: DocumentoCreateManyVendaInput | DocumentoCreateManyVendaInput[]
    skipDuplicates?: boolean
  }

  export type ClienteUpsertWithoutVendasInput = {
    update: XOR<ClienteUpdateWithoutVendasInput, ClienteUncheckedUpdateWithoutVendasInput>
    create: XOR<ClienteCreateWithoutVendasInput, ClienteUncheckedCreateWithoutVendasInput>
    where?: ClienteWhereInput
  }

  export type ClienteUpdateToOneWithWhereWithoutVendasInput = {
    where?: ClienteWhereInput
    data: XOR<ClienteUpdateWithoutVendasInput, ClienteUncheckedUpdateWithoutVendasInput>
  }

  export type ClienteUpdateWithoutVendasInput = {
    nome?: StringFieldUpdateOperationsInput | string
    renda?: NullableFloatFieldUpdateOperationsInput | number | null
    empresa?: NullableStringFieldUpdateOperationsInput | string | null
    matricula?: NullableStringFieldUpdateOperationsInput | string | null
    telefone?: NullableStringFieldUpdateOperationsInput | string | null
    cpf?: NullableStringFieldUpdateOperationsInput | string | null
    cnpj?: NullableStringFieldUpdateOperationsInput | string | null
    tipo?: NullableStringFieldUpdateOperationsInput | string | null
    dataNascimento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cep?: NullableStringFieldUpdateOperationsInput | string | null
    endereco?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    asaasCustomerId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ClienteUncheckedUpdateWithoutVendasInput = {
    id?: IntFieldUpdateOperationsInput | number
    nome?: StringFieldUpdateOperationsInput | string
    renda?: NullableFloatFieldUpdateOperationsInput | number | null
    empresa?: NullableStringFieldUpdateOperationsInput | string | null
    matricula?: NullableStringFieldUpdateOperationsInput | string | null
    telefone?: NullableStringFieldUpdateOperationsInput | string | null
    cpf?: NullableStringFieldUpdateOperationsInput | string | null
    cnpj?: NullableStringFieldUpdateOperationsInput | string | null
    tipo?: NullableStringFieldUpdateOperationsInput | string | null
    dataNascimento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    cep?: NullableStringFieldUpdateOperationsInput | string | null
    endereco?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    asaasCustomerId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ItemVendaUpsertWithWhereUniqueWithoutVendaInput = {
    where: ItemVendaWhereUniqueInput
    update: XOR<ItemVendaUpdateWithoutVendaInput, ItemVendaUncheckedUpdateWithoutVendaInput>
    create: XOR<ItemVendaCreateWithoutVendaInput, ItemVendaUncheckedCreateWithoutVendaInput>
  }

  export type ItemVendaUpdateWithWhereUniqueWithoutVendaInput = {
    where: ItemVendaWhereUniqueInput
    data: XOR<ItemVendaUpdateWithoutVendaInput, ItemVendaUncheckedUpdateWithoutVendaInput>
  }

  export type ItemVendaUpdateManyWithWhereWithoutVendaInput = {
    where: ItemVendaScalarWhereInput
    data: XOR<ItemVendaUpdateManyMutationInput, ItemVendaUncheckedUpdateManyWithoutVendaInput>
  }

  export type ItemVendaScalarWhereInput = {
    AND?: ItemVendaScalarWhereInput | ItemVendaScalarWhereInput[]
    OR?: ItemVendaScalarWhereInput[]
    NOT?: ItemVendaScalarWhereInput | ItemVendaScalarWhereInput[]
    id?: IntFilter<"ItemVenda"> | number
    vendaId?: IntFilter<"ItemVenda"> | number
    produtoNome?: StringFilter<"ItemVenda"> | string
    custoProduto?: FloatFilter<"ItemVenda"> | number
    valorVenda?: FloatFilter<"ItemVenda"> | number
    quantidade?: IntFilter<"ItemVenda"> | number
    subtotal?: FloatFilter<"ItemVenda"> | number
  }

  export type ParcelaVencimentoUpsertWithWhereUniqueWithoutVendaInput = {
    where: ParcelaVencimentoWhereUniqueInput
    update: XOR<ParcelaVencimentoUpdateWithoutVendaInput, ParcelaVencimentoUncheckedUpdateWithoutVendaInput>
    create: XOR<ParcelaVencimentoCreateWithoutVendaInput, ParcelaVencimentoUncheckedCreateWithoutVendaInput>
  }

  export type ParcelaVencimentoUpdateWithWhereUniqueWithoutVendaInput = {
    where: ParcelaVencimentoWhereUniqueInput
    data: XOR<ParcelaVencimentoUpdateWithoutVendaInput, ParcelaVencimentoUncheckedUpdateWithoutVendaInput>
  }

  export type ParcelaVencimentoUpdateManyWithWhereWithoutVendaInput = {
    where: ParcelaVencimentoScalarWhereInput
    data: XOR<ParcelaVencimentoUpdateManyMutationInput, ParcelaVencimentoUncheckedUpdateManyWithoutVendaInput>
  }

  export type ParcelaVencimentoScalarWhereInput = {
    AND?: ParcelaVencimentoScalarWhereInput | ParcelaVencimentoScalarWhereInput[]
    OR?: ParcelaVencimentoScalarWhereInput[]
    NOT?: ParcelaVencimentoScalarWhereInput | ParcelaVencimentoScalarWhereInput[]
    id?: IntFilter<"ParcelaVencimento"> | number
    vendaId?: IntFilter<"ParcelaVencimento"> | number
    numeroParcela?: IntFilter<"ParcelaVencimento"> | number
    dataVencimento?: DateTimeFilter<"ParcelaVencimento"> | Date | string
    valorParcela?: FloatFilter<"ParcelaVencimento"> | number
    paga?: BoolFilter<"ParcelaVencimento"> | boolean
    dataPagamento?: DateTimeNullableFilter<"ParcelaVencimento"> | Date | string | null
  }

  export type DocumentoUpsertWithWhereUniqueWithoutVendaInput = {
    where: DocumentoWhereUniqueInput
    update: XOR<DocumentoUpdateWithoutVendaInput, DocumentoUncheckedUpdateWithoutVendaInput>
    create: XOR<DocumentoCreateWithoutVendaInput, DocumentoUncheckedCreateWithoutVendaInput>
  }

  export type DocumentoUpdateWithWhereUniqueWithoutVendaInput = {
    where: DocumentoWhereUniqueInput
    data: XOR<DocumentoUpdateWithoutVendaInput, DocumentoUncheckedUpdateWithoutVendaInput>
  }

  export type DocumentoUpdateManyWithWhereWithoutVendaInput = {
    where: DocumentoScalarWhereInput
    data: XOR<DocumentoUpdateManyMutationInput, DocumentoUncheckedUpdateManyWithoutVendaInput>
  }

  export type DocumentoScalarWhereInput = {
    AND?: DocumentoScalarWhereInput | DocumentoScalarWhereInput[]
    OR?: DocumentoScalarWhereInput[]
    NOT?: DocumentoScalarWhereInput | DocumentoScalarWhereInput[]
    id?: IntFilter<"Documento"> | number
    vendaId?: IntNullableFilter<"Documento"> | number | null
    tipo?: StringFilter<"Documento"> | string
    mimeType?: StringFilter<"Documento"> | string
    conteudo?: BytesFilter<"Documento"> | Bytes
    tamanhoBytes?: IntFilter<"Documento"> | number
    criadoEm?: DateTimeFilter<"Documento"> | Date | string
  }

  export type VendaCreateWithoutDocumentosInput = {
    uuid?: string | null
    dataVenda: Date | string
    vendedor?: string | null
    produtoNome?: string | null
    custoProduto?: number | null
    quantidade?: number | null
    valorVenda?: number | null
    valorFrete?: number | null
    custoEnvio?: number | null
    parcelas?: number | null
    valorParcela?: number | null
    taxaFinanceiraValor?: number | null
    lucroLiquido?: number | null
    antecipada?: number | null
    excedeuLimite?: number | null
    temNota?: boolean
    taxaNota?: number | null
    comprovantePdf?: string | null
    descontoEmFolha?: boolean
    assinaturaToken?: string | null
    assinaturaStatus?: string | null
    assinaturaEm?: Date | string | null
    boleto?: boolean
    asaasPaymentId?: string | null
    boletoUrl?: string | null
    cliente?: ClienteCreateNestedOneWithoutVendasInput
    itens?: ItemVendaCreateNestedManyWithoutVendaInput
    parcelasVencimento?: ParcelaVencimentoCreateNestedManyWithoutVendaInput
  }

  export type VendaUncheckedCreateWithoutDocumentosInput = {
    id?: number
    uuid?: string | null
    dataVenda: Date | string
    vendedor?: string | null
    clienteId?: number | null
    produtoNome?: string | null
    custoProduto?: number | null
    quantidade?: number | null
    valorVenda?: number | null
    valorFrete?: number | null
    custoEnvio?: number | null
    parcelas?: number | null
    valorParcela?: number | null
    taxaFinanceiraValor?: number | null
    lucroLiquido?: number | null
    antecipada?: number | null
    excedeuLimite?: number | null
    temNota?: boolean
    taxaNota?: number | null
    comprovantePdf?: string | null
    descontoEmFolha?: boolean
    assinaturaToken?: string | null
    assinaturaStatus?: string | null
    assinaturaEm?: Date | string | null
    boleto?: boolean
    asaasPaymentId?: string | null
    boletoUrl?: string | null
    itens?: ItemVendaUncheckedCreateNestedManyWithoutVendaInput
    parcelasVencimento?: ParcelaVencimentoUncheckedCreateNestedManyWithoutVendaInput
  }

  export type VendaCreateOrConnectWithoutDocumentosInput = {
    where: VendaWhereUniqueInput
    create: XOR<VendaCreateWithoutDocumentosInput, VendaUncheckedCreateWithoutDocumentosInput>
  }

  export type VendaUpsertWithoutDocumentosInput = {
    update: XOR<VendaUpdateWithoutDocumentosInput, VendaUncheckedUpdateWithoutDocumentosInput>
    create: XOR<VendaCreateWithoutDocumentosInput, VendaUncheckedCreateWithoutDocumentosInput>
    where?: VendaWhereInput
  }

  export type VendaUpdateToOneWithWhereWithoutDocumentosInput = {
    where?: VendaWhereInput
    data: XOR<VendaUpdateWithoutDocumentosInput, VendaUncheckedUpdateWithoutDocumentosInput>
  }

  export type VendaUpdateWithoutDocumentosInput = {
    uuid?: NullableStringFieldUpdateOperationsInput | string | null
    dataVenda?: DateTimeFieldUpdateOperationsInput | Date | string
    vendedor?: NullableStringFieldUpdateOperationsInput | string | null
    produtoNome?: NullableStringFieldUpdateOperationsInput | string | null
    custoProduto?: NullableFloatFieldUpdateOperationsInput | number | null
    quantidade?: NullableIntFieldUpdateOperationsInput | number | null
    valorVenda?: NullableFloatFieldUpdateOperationsInput | number | null
    valorFrete?: NullableFloatFieldUpdateOperationsInput | number | null
    custoEnvio?: NullableFloatFieldUpdateOperationsInput | number | null
    parcelas?: NullableIntFieldUpdateOperationsInput | number | null
    valorParcela?: NullableFloatFieldUpdateOperationsInput | number | null
    taxaFinanceiraValor?: NullableFloatFieldUpdateOperationsInput | number | null
    lucroLiquido?: NullableFloatFieldUpdateOperationsInput | number | null
    antecipada?: NullableIntFieldUpdateOperationsInput | number | null
    excedeuLimite?: NullableIntFieldUpdateOperationsInput | number | null
    temNota?: BoolFieldUpdateOperationsInput | boolean
    taxaNota?: NullableFloatFieldUpdateOperationsInput | number | null
    comprovantePdf?: NullableStringFieldUpdateOperationsInput | string | null
    descontoEmFolha?: BoolFieldUpdateOperationsInput | boolean
    assinaturaToken?: NullableStringFieldUpdateOperationsInput | string | null
    assinaturaStatus?: NullableStringFieldUpdateOperationsInput | string | null
    assinaturaEm?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    boleto?: BoolFieldUpdateOperationsInput | boolean
    asaasPaymentId?: NullableStringFieldUpdateOperationsInput | string | null
    boletoUrl?: NullableStringFieldUpdateOperationsInput | string | null
    cliente?: ClienteUpdateOneWithoutVendasNestedInput
    itens?: ItemVendaUpdateManyWithoutVendaNestedInput
    parcelasVencimento?: ParcelaVencimentoUpdateManyWithoutVendaNestedInput
  }

  export type VendaUncheckedUpdateWithoutDocumentosInput = {
    id?: IntFieldUpdateOperationsInput | number
    uuid?: NullableStringFieldUpdateOperationsInput | string | null
    dataVenda?: DateTimeFieldUpdateOperationsInput | Date | string
    vendedor?: NullableStringFieldUpdateOperationsInput | string | null
    clienteId?: NullableIntFieldUpdateOperationsInput | number | null
    produtoNome?: NullableStringFieldUpdateOperationsInput | string | null
    custoProduto?: NullableFloatFieldUpdateOperationsInput | number | null
    quantidade?: NullableIntFieldUpdateOperationsInput | number | null
    valorVenda?: NullableFloatFieldUpdateOperationsInput | number | null
    valorFrete?: NullableFloatFieldUpdateOperationsInput | number | null
    custoEnvio?: NullableFloatFieldUpdateOperationsInput | number | null
    parcelas?: NullableIntFieldUpdateOperationsInput | number | null
    valorParcela?: NullableFloatFieldUpdateOperationsInput | number | null
    taxaFinanceiraValor?: NullableFloatFieldUpdateOperationsInput | number | null
    lucroLiquido?: NullableFloatFieldUpdateOperationsInput | number | null
    antecipada?: NullableIntFieldUpdateOperationsInput | number | null
    excedeuLimite?: NullableIntFieldUpdateOperationsInput | number | null
    temNota?: BoolFieldUpdateOperationsInput | boolean
    taxaNota?: NullableFloatFieldUpdateOperationsInput | number | null
    comprovantePdf?: NullableStringFieldUpdateOperationsInput | string | null
    descontoEmFolha?: BoolFieldUpdateOperationsInput | boolean
    assinaturaToken?: NullableStringFieldUpdateOperationsInput | string | null
    assinaturaStatus?: NullableStringFieldUpdateOperationsInput | string | null
    assinaturaEm?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    boleto?: BoolFieldUpdateOperationsInput | boolean
    asaasPaymentId?: NullableStringFieldUpdateOperationsInput | string | null
    boletoUrl?: NullableStringFieldUpdateOperationsInput | string | null
    itens?: ItemVendaUncheckedUpdateManyWithoutVendaNestedInput
    parcelasVencimento?: ParcelaVencimentoUncheckedUpdateManyWithoutVendaNestedInput
  }

  export type VendaCreateWithoutItensInput = {
    uuid?: string | null
    dataVenda: Date | string
    vendedor?: string | null
    produtoNome?: string | null
    custoProduto?: number | null
    quantidade?: number | null
    valorVenda?: number | null
    valorFrete?: number | null
    custoEnvio?: number | null
    parcelas?: number | null
    valorParcela?: number | null
    taxaFinanceiraValor?: number | null
    lucroLiquido?: number | null
    antecipada?: number | null
    excedeuLimite?: number | null
    temNota?: boolean
    taxaNota?: number | null
    comprovantePdf?: string | null
    descontoEmFolha?: boolean
    assinaturaToken?: string | null
    assinaturaStatus?: string | null
    assinaturaEm?: Date | string | null
    boleto?: boolean
    asaasPaymentId?: string | null
    boletoUrl?: string | null
    cliente?: ClienteCreateNestedOneWithoutVendasInput
    parcelasVencimento?: ParcelaVencimentoCreateNestedManyWithoutVendaInput
    documentos?: DocumentoCreateNestedManyWithoutVendaInput
  }

  export type VendaUncheckedCreateWithoutItensInput = {
    id?: number
    uuid?: string | null
    dataVenda: Date | string
    vendedor?: string | null
    clienteId?: number | null
    produtoNome?: string | null
    custoProduto?: number | null
    quantidade?: number | null
    valorVenda?: number | null
    valorFrete?: number | null
    custoEnvio?: number | null
    parcelas?: number | null
    valorParcela?: number | null
    taxaFinanceiraValor?: number | null
    lucroLiquido?: number | null
    antecipada?: number | null
    excedeuLimite?: number | null
    temNota?: boolean
    taxaNota?: number | null
    comprovantePdf?: string | null
    descontoEmFolha?: boolean
    assinaturaToken?: string | null
    assinaturaStatus?: string | null
    assinaturaEm?: Date | string | null
    boleto?: boolean
    asaasPaymentId?: string | null
    boletoUrl?: string | null
    parcelasVencimento?: ParcelaVencimentoUncheckedCreateNestedManyWithoutVendaInput
    documentos?: DocumentoUncheckedCreateNestedManyWithoutVendaInput
  }

  export type VendaCreateOrConnectWithoutItensInput = {
    where: VendaWhereUniqueInput
    create: XOR<VendaCreateWithoutItensInput, VendaUncheckedCreateWithoutItensInput>
  }

  export type VendaUpsertWithoutItensInput = {
    update: XOR<VendaUpdateWithoutItensInput, VendaUncheckedUpdateWithoutItensInput>
    create: XOR<VendaCreateWithoutItensInput, VendaUncheckedCreateWithoutItensInput>
    where?: VendaWhereInput
  }

  export type VendaUpdateToOneWithWhereWithoutItensInput = {
    where?: VendaWhereInput
    data: XOR<VendaUpdateWithoutItensInput, VendaUncheckedUpdateWithoutItensInput>
  }

  export type VendaUpdateWithoutItensInput = {
    uuid?: NullableStringFieldUpdateOperationsInput | string | null
    dataVenda?: DateTimeFieldUpdateOperationsInput | Date | string
    vendedor?: NullableStringFieldUpdateOperationsInput | string | null
    produtoNome?: NullableStringFieldUpdateOperationsInput | string | null
    custoProduto?: NullableFloatFieldUpdateOperationsInput | number | null
    quantidade?: NullableIntFieldUpdateOperationsInput | number | null
    valorVenda?: NullableFloatFieldUpdateOperationsInput | number | null
    valorFrete?: NullableFloatFieldUpdateOperationsInput | number | null
    custoEnvio?: NullableFloatFieldUpdateOperationsInput | number | null
    parcelas?: NullableIntFieldUpdateOperationsInput | number | null
    valorParcela?: NullableFloatFieldUpdateOperationsInput | number | null
    taxaFinanceiraValor?: NullableFloatFieldUpdateOperationsInput | number | null
    lucroLiquido?: NullableFloatFieldUpdateOperationsInput | number | null
    antecipada?: NullableIntFieldUpdateOperationsInput | number | null
    excedeuLimite?: NullableIntFieldUpdateOperationsInput | number | null
    temNota?: BoolFieldUpdateOperationsInput | boolean
    taxaNota?: NullableFloatFieldUpdateOperationsInput | number | null
    comprovantePdf?: NullableStringFieldUpdateOperationsInput | string | null
    descontoEmFolha?: BoolFieldUpdateOperationsInput | boolean
    assinaturaToken?: NullableStringFieldUpdateOperationsInput | string | null
    assinaturaStatus?: NullableStringFieldUpdateOperationsInput | string | null
    assinaturaEm?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    boleto?: BoolFieldUpdateOperationsInput | boolean
    asaasPaymentId?: NullableStringFieldUpdateOperationsInput | string | null
    boletoUrl?: NullableStringFieldUpdateOperationsInput | string | null
    cliente?: ClienteUpdateOneWithoutVendasNestedInput
    parcelasVencimento?: ParcelaVencimentoUpdateManyWithoutVendaNestedInput
    documentos?: DocumentoUpdateManyWithoutVendaNestedInput
  }

  export type VendaUncheckedUpdateWithoutItensInput = {
    id?: IntFieldUpdateOperationsInput | number
    uuid?: NullableStringFieldUpdateOperationsInput | string | null
    dataVenda?: DateTimeFieldUpdateOperationsInput | Date | string
    vendedor?: NullableStringFieldUpdateOperationsInput | string | null
    clienteId?: NullableIntFieldUpdateOperationsInput | number | null
    produtoNome?: NullableStringFieldUpdateOperationsInput | string | null
    custoProduto?: NullableFloatFieldUpdateOperationsInput | number | null
    quantidade?: NullableIntFieldUpdateOperationsInput | number | null
    valorVenda?: NullableFloatFieldUpdateOperationsInput | number | null
    valorFrete?: NullableFloatFieldUpdateOperationsInput | number | null
    custoEnvio?: NullableFloatFieldUpdateOperationsInput | number | null
    parcelas?: NullableIntFieldUpdateOperationsInput | number | null
    valorParcela?: NullableFloatFieldUpdateOperationsInput | number | null
    taxaFinanceiraValor?: NullableFloatFieldUpdateOperationsInput | number | null
    lucroLiquido?: NullableFloatFieldUpdateOperationsInput | number | null
    antecipada?: NullableIntFieldUpdateOperationsInput | number | null
    excedeuLimite?: NullableIntFieldUpdateOperationsInput | number | null
    temNota?: BoolFieldUpdateOperationsInput | boolean
    taxaNota?: NullableFloatFieldUpdateOperationsInput | number | null
    comprovantePdf?: NullableStringFieldUpdateOperationsInput | string | null
    descontoEmFolha?: BoolFieldUpdateOperationsInput | boolean
    assinaturaToken?: NullableStringFieldUpdateOperationsInput | string | null
    assinaturaStatus?: NullableStringFieldUpdateOperationsInput | string | null
    assinaturaEm?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    boleto?: BoolFieldUpdateOperationsInput | boolean
    asaasPaymentId?: NullableStringFieldUpdateOperationsInput | string | null
    boletoUrl?: NullableStringFieldUpdateOperationsInput | string | null
    parcelasVencimento?: ParcelaVencimentoUncheckedUpdateManyWithoutVendaNestedInput
    documentos?: DocumentoUncheckedUpdateManyWithoutVendaNestedInput
  }

  export type VendaCreateWithoutParcelasVencimentoInput = {
    uuid?: string | null
    dataVenda: Date | string
    vendedor?: string | null
    produtoNome?: string | null
    custoProduto?: number | null
    quantidade?: number | null
    valorVenda?: number | null
    valorFrete?: number | null
    custoEnvio?: number | null
    parcelas?: number | null
    valorParcela?: number | null
    taxaFinanceiraValor?: number | null
    lucroLiquido?: number | null
    antecipada?: number | null
    excedeuLimite?: number | null
    temNota?: boolean
    taxaNota?: number | null
    comprovantePdf?: string | null
    descontoEmFolha?: boolean
    assinaturaToken?: string | null
    assinaturaStatus?: string | null
    assinaturaEm?: Date | string | null
    boleto?: boolean
    asaasPaymentId?: string | null
    boletoUrl?: string | null
    cliente?: ClienteCreateNestedOneWithoutVendasInput
    itens?: ItemVendaCreateNestedManyWithoutVendaInput
    documentos?: DocumentoCreateNestedManyWithoutVendaInput
  }

  export type VendaUncheckedCreateWithoutParcelasVencimentoInput = {
    id?: number
    uuid?: string | null
    dataVenda: Date | string
    vendedor?: string | null
    clienteId?: number | null
    produtoNome?: string | null
    custoProduto?: number | null
    quantidade?: number | null
    valorVenda?: number | null
    valorFrete?: number | null
    custoEnvio?: number | null
    parcelas?: number | null
    valorParcela?: number | null
    taxaFinanceiraValor?: number | null
    lucroLiquido?: number | null
    antecipada?: number | null
    excedeuLimite?: number | null
    temNota?: boolean
    taxaNota?: number | null
    comprovantePdf?: string | null
    descontoEmFolha?: boolean
    assinaturaToken?: string | null
    assinaturaStatus?: string | null
    assinaturaEm?: Date | string | null
    boleto?: boolean
    asaasPaymentId?: string | null
    boletoUrl?: string | null
    itens?: ItemVendaUncheckedCreateNestedManyWithoutVendaInput
    documentos?: DocumentoUncheckedCreateNestedManyWithoutVendaInput
  }

  export type VendaCreateOrConnectWithoutParcelasVencimentoInput = {
    where: VendaWhereUniqueInput
    create: XOR<VendaCreateWithoutParcelasVencimentoInput, VendaUncheckedCreateWithoutParcelasVencimentoInput>
  }

  export type VendaUpsertWithoutParcelasVencimentoInput = {
    update: XOR<VendaUpdateWithoutParcelasVencimentoInput, VendaUncheckedUpdateWithoutParcelasVencimentoInput>
    create: XOR<VendaCreateWithoutParcelasVencimentoInput, VendaUncheckedCreateWithoutParcelasVencimentoInput>
    where?: VendaWhereInput
  }

  export type VendaUpdateToOneWithWhereWithoutParcelasVencimentoInput = {
    where?: VendaWhereInput
    data: XOR<VendaUpdateWithoutParcelasVencimentoInput, VendaUncheckedUpdateWithoutParcelasVencimentoInput>
  }

  export type VendaUpdateWithoutParcelasVencimentoInput = {
    uuid?: NullableStringFieldUpdateOperationsInput | string | null
    dataVenda?: DateTimeFieldUpdateOperationsInput | Date | string
    vendedor?: NullableStringFieldUpdateOperationsInput | string | null
    produtoNome?: NullableStringFieldUpdateOperationsInput | string | null
    custoProduto?: NullableFloatFieldUpdateOperationsInput | number | null
    quantidade?: NullableIntFieldUpdateOperationsInput | number | null
    valorVenda?: NullableFloatFieldUpdateOperationsInput | number | null
    valorFrete?: NullableFloatFieldUpdateOperationsInput | number | null
    custoEnvio?: NullableFloatFieldUpdateOperationsInput | number | null
    parcelas?: NullableIntFieldUpdateOperationsInput | number | null
    valorParcela?: NullableFloatFieldUpdateOperationsInput | number | null
    taxaFinanceiraValor?: NullableFloatFieldUpdateOperationsInput | number | null
    lucroLiquido?: NullableFloatFieldUpdateOperationsInput | number | null
    antecipada?: NullableIntFieldUpdateOperationsInput | number | null
    excedeuLimite?: NullableIntFieldUpdateOperationsInput | number | null
    temNota?: BoolFieldUpdateOperationsInput | boolean
    taxaNota?: NullableFloatFieldUpdateOperationsInput | number | null
    comprovantePdf?: NullableStringFieldUpdateOperationsInput | string | null
    descontoEmFolha?: BoolFieldUpdateOperationsInput | boolean
    assinaturaToken?: NullableStringFieldUpdateOperationsInput | string | null
    assinaturaStatus?: NullableStringFieldUpdateOperationsInput | string | null
    assinaturaEm?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    boleto?: BoolFieldUpdateOperationsInput | boolean
    asaasPaymentId?: NullableStringFieldUpdateOperationsInput | string | null
    boletoUrl?: NullableStringFieldUpdateOperationsInput | string | null
    cliente?: ClienteUpdateOneWithoutVendasNestedInput
    itens?: ItemVendaUpdateManyWithoutVendaNestedInput
    documentos?: DocumentoUpdateManyWithoutVendaNestedInput
  }

  export type VendaUncheckedUpdateWithoutParcelasVencimentoInput = {
    id?: IntFieldUpdateOperationsInput | number
    uuid?: NullableStringFieldUpdateOperationsInput | string | null
    dataVenda?: DateTimeFieldUpdateOperationsInput | Date | string
    vendedor?: NullableStringFieldUpdateOperationsInput | string | null
    clienteId?: NullableIntFieldUpdateOperationsInput | number | null
    produtoNome?: NullableStringFieldUpdateOperationsInput | string | null
    custoProduto?: NullableFloatFieldUpdateOperationsInput | number | null
    quantidade?: NullableIntFieldUpdateOperationsInput | number | null
    valorVenda?: NullableFloatFieldUpdateOperationsInput | number | null
    valorFrete?: NullableFloatFieldUpdateOperationsInput | number | null
    custoEnvio?: NullableFloatFieldUpdateOperationsInput | number | null
    parcelas?: NullableIntFieldUpdateOperationsInput | number | null
    valorParcela?: NullableFloatFieldUpdateOperationsInput | number | null
    taxaFinanceiraValor?: NullableFloatFieldUpdateOperationsInput | number | null
    lucroLiquido?: NullableFloatFieldUpdateOperationsInput | number | null
    antecipada?: NullableIntFieldUpdateOperationsInput | number | null
    excedeuLimite?: NullableIntFieldUpdateOperationsInput | number | null
    temNota?: BoolFieldUpdateOperationsInput | boolean
    taxaNota?: NullableFloatFieldUpdateOperationsInput | number | null
    comprovantePdf?: NullableStringFieldUpdateOperationsInput | string | null
    descontoEmFolha?: BoolFieldUpdateOperationsInput | boolean
    assinaturaToken?: NullableStringFieldUpdateOperationsInput | string | null
    assinaturaStatus?: NullableStringFieldUpdateOperationsInput | string | null
    assinaturaEm?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    boleto?: BoolFieldUpdateOperationsInput | boolean
    asaasPaymentId?: NullableStringFieldUpdateOperationsInput | string | null
    boletoUrl?: NullableStringFieldUpdateOperationsInput | string | null
    itens?: ItemVendaUncheckedUpdateManyWithoutVendaNestedInput
    documentos?: DocumentoUncheckedUpdateManyWithoutVendaNestedInput
  }

  export type ProdutoCreateWithoutFornecedorInput = {
    nome: string
    custoPadrao?: number | null
    marca?: string | null
    categoria?: string | null
    ncm?: string | null
    imagem?: string | null
    qtdEstoque?: number | null
    valorVenda?: number | null
  }

  export type ProdutoUncheckedCreateWithoutFornecedorInput = {
    id?: number
    nome: string
    custoPadrao?: number | null
    marca?: string | null
    categoria?: string | null
    ncm?: string | null
    imagem?: string | null
    qtdEstoque?: number | null
    valorVenda?: number | null
  }

  export type ProdutoCreateOrConnectWithoutFornecedorInput = {
    where: ProdutoWhereUniqueInput
    create: XOR<ProdutoCreateWithoutFornecedorInput, ProdutoUncheckedCreateWithoutFornecedorInput>
  }

  export type ProdutoCreateManyFornecedorInputEnvelope = {
    data: ProdutoCreateManyFornecedorInput | ProdutoCreateManyFornecedorInput[]
    skipDuplicates?: boolean
  }

  export type ProdutoUpsertWithWhereUniqueWithoutFornecedorInput = {
    where: ProdutoWhereUniqueInput
    update: XOR<ProdutoUpdateWithoutFornecedorInput, ProdutoUncheckedUpdateWithoutFornecedorInput>
    create: XOR<ProdutoCreateWithoutFornecedorInput, ProdutoUncheckedCreateWithoutFornecedorInput>
  }

  export type ProdutoUpdateWithWhereUniqueWithoutFornecedorInput = {
    where: ProdutoWhereUniqueInput
    data: XOR<ProdutoUpdateWithoutFornecedorInput, ProdutoUncheckedUpdateWithoutFornecedorInput>
  }

  export type ProdutoUpdateManyWithWhereWithoutFornecedorInput = {
    where: ProdutoScalarWhereInput
    data: XOR<ProdutoUpdateManyMutationInput, ProdutoUncheckedUpdateManyWithoutFornecedorInput>
  }

  export type ProdutoScalarWhereInput = {
    AND?: ProdutoScalarWhereInput | ProdutoScalarWhereInput[]
    OR?: ProdutoScalarWhereInput[]
    NOT?: ProdutoScalarWhereInput | ProdutoScalarWhereInput[]
    id?: IntFilter<"Produto"> | number
    nome?: StringFilter<"Produto"> | string
    custoPadrao?: FloatNullableFilter<"Produto"> | number | null
    marca?: StringNullableFilter<"Produto"> | string | null
    categoria?: StringNullableFilter<"Produto"> | string | null
    ncm?: StringNullableFilter<"Produto"> | string | null
    imagem?: StringNullableFilter<"Produto"> | string | null
    fornecedorId?: IntNullableFilter<"Produto"> | number | null
    qtdEstoque?: IntNullableFilter<"Produto"> | number | null
    valorVenda?: FloatNullableFilter<"Produto"> | number | null
  }

  export type VendaCreateManyClienteInput = {
    id?: number
    uuid?: string | null
    dataVenda: Date | string
    vendedor?: string | null
    produtoNome?: string | null
    custoProduto?: number | null
    quantidade?: number | null
    valorVenda?: number | null
    valorFrete?: number | null
    custoEnvio?: number | null
    parcelas?: number | null
    valorParcela?: number | null
    taxaFinanceiraValor?: number | null
    lucroLiquido?: number | null
    antecipada?: number | null
    excedeuLimite?: number | null
    temNota?: boolean
    taxaNota?: number | null
    comprovantePdf?: string | null
    descontoEmFolha?: boolean
    assinaturaToken?: string | null
    assinaturaStatus?: string | null
    assinaturaEm?: Date | string | null
    boleto?: boolean
    asaasPaymentId?: string | null
    boletoUrl?: string | null
  }

  export type VendaUpdateWithoutClienteInput = {
    uuid?: NullableStringFieldUpdateOperationsInput | string | null
    dataVenda?: DateTimeFieldUpdateOperationsInput | Date | string
    vendedor?: NullableStringFieldUpdateOperationsInput | string | null
    produtoNome?: NullableStringFieldUpdateOperationsInput | string | null
    custoProduto?: NullableFloatFieldUpdateOperationsInput | number | null
    quantidade?: NullableIntFieldUpdateOperationsInput | number | null
    valorVenda?: NullableFloatFieldUpdateOperationsInput | number | null
    valorFrete?: NullableFloatFieldUpdateOperationsInput | number | null
    custoEnvio?: NullableFloatFieldUpdateOperationsInput | number | null
    parcelas?: NullableIntFieldUpdateOperationsInput | number | null
    valorParcela?: NullableFloatFieldUpdateOperationsInput | number | null
    taxaFinanceiraValor?: NullableFloatFieldUpdateOperationsInput | number | null
    lucroLiquido?: NullableFloatFieldUpdateOperationsInput | number | null
    antecipada?: NullableIntFieldUpdateOperationsInput | number | null
    excedeuLimite?: NullableIntFieldUpdateOperationsInput | number | null
    temNota?: BoolFieldUpdateOperationsInput | boolean
    taxaNota?: NullableFloatFieldUpdateOperationsInput | number | null
    comprovantePdf?: NullableStringFieldUpdateOperationsInput | string | null
    descontoEmFolha?: BoolFieldUpdateOperationsInput | boolean
    assinaturaToken?: NullableStringFieldUpdateOperationsInput | string | null
    assinaturaStatus?: NullableStringFieldUpdateOperationsInput | string | null
    assinaturaEm?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    boleto?: BoolFieldUpdateOperationsInput | boolean
    asaasPaymentId?: NullableStringFieldUpdateOperationsInput | string | null
    boletoUrl?: NullableStringFieldUpdateOperationsInput | string | null
    itens?: ItemVendaUpdateManyWithoutVendaNestedInput
    parcelasVencimento?: ParcelaVencimentoUpdateManyWithoutVendaNestedInput
    documentos?: DocumentoUpdateManyWithoutVendaNestedInput
  }

  export type VendaUncheckedUpdateWithoutClienteInput = {
    id?: IntFieldUpdateOperationsInput | number
    uuid?: NullableStringFieldUpdateOperationsInput | string | null
    dataVenda?: DateTimeFieldUpdateOperationsInput | Date | string
    vendedor?: NullableStringFieldUpdateOperationsInput | string | null
    produtoNome?: NullableStringFieldUpdateOperationsInput | string | null
    custoProduto?: NullableFloatFieldUpdateOperationsInput | number | null
    quantidade?: NullableIntFieldUpdateOperationsInput | number | null
    valorVenda?: NullableFloatFieldUpdateOperationsInput | number | null
    valorFrete?: NullableFloatFieldUpdateOperationsInput | number | null
    custoEnvio?: NullableFloatFieldUpdateOperationsInput | number | null
    parcelas?: NullableIntFieldUpdateOperationsInput | number | null
    valorParcela?: NullableFloatFieldUpdateOperationsInput | number | null
    taxaFinanceiraValor?: NullableFloatFieldUpdateOperationsInput | number | null
    lucroLiquido?: NullableFloatFieldUpdateOperationsInput | number | null
    antecipada?: NullableIntFieldUpdateOperationsInput | number | null
    excedeuLimite?: NullableIntFieldUpdateOperationsInput | number | null
    temNota?: BoolFieldUpdateOperationsInput | boolean
    taxaNota?: NullableFloatFieldUpdateOperationsInput | number | null
    comprovantePdf?: NullableStringFieldUpdateOperationsInput | string | null
    descontoEmFolha?: BoolFieldUpdateOperationsInput | boolean
    assinaturaToken?: NullableStringFieldUpdateOperationsInput | string | null
    assinaturaStatus?: NullableStringFieldUpdateOperationsInput | string | null
    assinaturaEm?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    boleto?: BoolFieldUpdateOperationsInput | boolean
    asaasPaymentId?: NullableStringFieldUpdateOperationsInput | string | null
    boletoUrl?: NullableStringFieldUpdateOperationsInput | string | null
    itens?: ItemVendaUncheckedUpdateManyWithoutVendaNestedInput
    parcelasVencimento?: ParcelaVencimentoUncheckedUpdateManyWithoutVendaNestedInput
    documentos?: DocumentoUncheckedUpdateManyWithoutVendaNestedInput
  }

  export type VendaUncheckedUpdateManyWithoutClienteInput = {
    id?: IntFieldUpdateOperationsInput | number
    uuid?: NullableStringFieldUpdateOperationsInput | string | null
    dataVenda?: DateTimeFieldUpdateOperationsInput | Date | string
    vendedor?: NullableStringFieldUpdateOperationsInput | string | null
    produtoNome?: NullableStringFieldUpdateOperationsInput | string | null
    custoProduto?: NullableFloatFieldUpdateOperationsInput | number | null
    quantidade?: NullableIntFieldUpdateOperationsInput | number | null
    valorVenda?: NullableFloatFieldUpdateOperationsInput | number | null
    valorFrete?: NullableFloatFieldUpdateOperationsInput | number | null
    custoEnvio?: NullableFloatFieldUpdateOperationsInput | number | null
    parcelas?: NullableIntFieldUpdateOperationsInput | number | null
    valorParcela?: NullableFloatFieldUpdateOperationsInput | number | null
    taxaFinanceiraValor?: NullableFloatFieldUpdateOperationsInput | number | null
    lucroLiquido?: NullableFloatFieldUpdateOperationsInput | number | null
    antecipada?: NullableIntFieldUpdateOperationsInput | number | null
    excedeuLimite?: NullableIntFieldUpdateOperationsInput | number | null
    temNota?: BoolFieldUpdateOperationsInput | boolean
    taxaNota?: NullableFloatFieldUpdateOperationsInput | number | null
    comprovantePdf?: NullableStringFieldUpdateOperationsInput | string | null
    descontoEmFolha?: BoolFieldUpdateOperationsInput | boolean
    assinaturaToken?: NullableStringFieldUpdateOperationsInput | string | null
    assinaturaStatus?: NullableStringFieldUpdateOperationsInput | string | null
    assinaturaEm?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    boleto?: BoolFieldUpdateOperationsInput | boolean
    asaasPaymentId?: NullableStringFieldUpdateOperationsInput | string | null
    boletoUrl?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ItemVendaCreateManyVendaInput = {
    id?: number
    produtoNome: string
    custoProduto: number
    valorVenda: number
    quantidade?: number
    subtotal: number
  }

  export type ParcelaVencimentoCreateManyVendaInput = {
    id?: number
    numeroParcela: number
    dataVencimento: Date | string
    valorParcela: number
    paga?: boolean
    dataPagamento?: Date | string | null
  }

  export type DocumentoCreateManyVendaInput = {
    id?: number
    tipo: string
    mimeType?: string
    conteudo: Bytes
    tamanhoBytes: number
    criadoEm?: Date | string
  }

  export type ItemVendaUpdateWithoutVendaInput = {
    produtoNome?: StringFieldUpdateOperationsInput | string
    custoProduto?: FloatFieldUpdateOperationsInput | number
    valorVenda?: FloatFieldUpdateOperationsInput | number
    quantidade?: IntFieldUpdateOperationsInput | number
    subtotal?: FloatFieldUpdateOperationsInput | number
  }

  export type ItemVendaUncheckedUpdateWithoutVendaInput = {
    id?: IntFieldUpdateOperationsInput | number
    produtoNome?: StringFieldUpdateOperationsInput | string
    custoProduto?: FloatFieldUpdateOperationsInput | number
    valorVenda?: FloatFieldUpdateOperationsInput | number
    quantidade?: IntFieldUpdateOperationsInput | number
    subtotal?: FloatFieldUpdateOperationsInput | number
  }

  export type ItemVendaUncheckedUpdateManyWithoutVendaInput = {
    id?: IntFieldUpdateOperationsInput | number
    produtoNome?: StringFieldUpdateOperationsInput | string
    custoProduto?: FloatFieldUpdateOperationsInput | number
    valorVenda?: FloatFieldUpdateOperationsInput | number
    quantidade?: IntFieldUpdateOperationsInput | number
    subtotal?: FloatFieldUpdateOperationsInput | number
  }

  export type ParcelaVencimentoUpdateWithoutVendaInput = {
    numeroParcela?: IntFieldUpdateOperationsInput | number
    dataVencimento?: DateTimeFieldUpdateOperationsInput | Date | string
    valorParcela?: FloatFieldUpdateOperationsInput | number
    paga?: BoolFieldUpdateOperationsInput | boolean
    dataPagamento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type ParcelaVencimentoUncheckedUpdateWithoutVendaInput = {
    id?: IntFieldUpdateOperationsInput | number
    numeroParcela?: IntFieldUpdateOperationsInput | number
    dataVencimento?: DateTimeFieldUpdateOperationsInput | Date | string
    valorParcela?: FloatFieldUpdateOperationsInput | number
    paga?: BoolFieldUpdateOperationsInput | boolean
    dataPagamento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type ParcelaVencimentoUncheckedUpdateManyWithoutVendaInput = {
    id?: IntFieldUpdateOperationsInput | number
    numeroParcela?: IntFieldUpdateOperationsInput | number
    dataVencimento?: DateTimeFieldUpdateOperationsInput | Date | string
    valorParcela?: FloatFieldUpdateOperationsInput | number
    paga?: BoolFieldUpdateOperationsInput | boolean
    dataPagamento?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type DocumentoUpdateWithoutVendaInput = {
    tipo?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    conteudo?: BytesFieldUpdateOperationsInput | Bytes
    tamanhoBytes?: IntFieldUpdateOperationsInput | number
    criadoEm?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DocumentoUncheckedUpdateWithoutVendaInput = {
    id?: IntFieldUpdateOperationsInput | number
    tipo?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    conteudo?: BytesFieldUpdateOperationsInput | Bytes
    tamanhoBytes?: IntFieldUpdateOperationsInput | number
    criadoEm?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DocumentoUncheckedUpdateManyWithoutVendaInput = {
    id?: IntFieldUpdateOperationsInput | number
    tipo?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    conteudo?: BytesFieldUpdateOperationsInput | Bytes
    tamanhoBytes?: IntFieldUpdateOperationsInput | number
    criadoEm?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProdutoCreateManyFornecedorInput = {
    id?: number
    nome: string
    custoPadrao?: number | null
    marca?: string | null
    categoria?: string | null
    ncm?: string | null
    imagem?: string | null
    qtdEstoque?: number | null
    valorVenda?: number | null
  }

  export type ProdutoUpdateWithoutFornecedorInput = {
    nome?: StringFieldUpdateOperationsInput | string
    custoPadrao?: NullableFloatFieldUpdateOperationsInput | number | null
    marca?: NullableStringFieldUpdateOperationsInput | string | null
    categoria?: NullableStringFieldUpdateOperationsInput | string | null
    ncm?: NullableStringFieldUpdateOperationsInput | string | null
    imagem?: NullableStringFieldUpdateOperationsInput | string | null
    qtdEstoque?: NullableIntFieldUpdateOperationsInput | number | null
    valorVenda?: NullableFloatFieldUpdateOperationsInput | number | null
  }

  export type ProdutoUncheckedUpdateWithoutFornecedorInput = {
    id?: IntFieldUpdateOperationsInput | number
    nome?: StringFieldUpdateOperationsInput | string
    custoPadrao?: NullableFloatFieldUpdateOperationsInput | number | null
    marca?: NullableStringFieldUpdateOperationsInput | string | null
    categoria?: NullableStringFieldUpdateOperationsInput | string | null
    ncm?: NullableStringFieldUpdateOperationsInput | string | null
    imagem?: NullableStringFieldUpdateOperationsInput | string | null
    qtdEstoque?: NullableIntFieldUpdateOperationsInput | number | null
    valorVenda?: NullableFloatFieldUpdateOperationsInput | number | null
  }

  export type ProdutoUncheckedUpdateManyWithoutFornecedorInput = {
    id?: IntFieldUpdateOperationsInput | number
    nome?: StringFieldUpdateOperationsInput | string
    custoPadrao?: NullableFloatFieldUpdateOperationsInput | number | null
    marca?: NullableStringFieldUpdateOperationsInput | string | null
    categoria?: NullableStringFieldUpdateOperationsInput | string | null
    ncm?: NullableStringFieldUpdateOperationsInput | string | null
    imagem?: NullableStringFieldUpdateOperationsInput | string | null
    qtdEstoque?: NullableIntFieldUpdateOperationsInput | number | null
    valorVenda?: NullableFloatFieldUpdateOperationsInput | number | null
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}