const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Payment Processor API',
    version: '1.0.0',
    description: 'API for creating payment invoices and receiving payment status webhooks.',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local development server',
    },
  ],
  tags: [
    {
      name: 'Health',
      description: 'Service health checks',
    },
    {
      name: 'Invoices',
      description: 'Merchant invoice operations',
    },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Check service health',
        responses: {
          '200': {
            description: 'Service is running',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status', 'uptime'],
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    uptime: { type: 'number', example: 12.34 },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/invoice': {
      post: {
        tags: ['Invoices'],
        summary: 'Create an invoice',
        description:
          'Creates a pending invoice. Merchant settings must already exist in MongoDB.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateInvoiceRequest',
              },
              examples: {
                default: {
                  summary: 'Default seeded merchant',
                  value: {
                    amount: '100.00',
                    currency: 'USD',
                    merchantId: 'merchant-1',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Invoice created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['data'],
                  properties: {
                    data: {
                      $ref: '#/components/schemas/Invoice',
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid request body, unsupported currency or invalid amount',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '404': {
            description: 'Merchant not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/invoice/{id}': {
      get: {
        tags: ['Invoices'],
        summary: 'Get invoice status',
        description: 'Returns the current invoice status and calculated amounts.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              example: '665f6f1e8b3f3d49e57a6e11',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Invoice found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['data'],
                  properties: {
                    data: {
                      $ref: '#/components/schemas/Invoice',
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid invoice id',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '404': {
            description: 'Invoice not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      CreateInvoiceRequest: {
        type: 'object',
        required: ['amount', 'currency', 'merchantId'],
        additionalProperties: false,
        properties: {
          amount: {
            type: 'string',
            pattern: '^\\d+(\\.\\d{1,3})?$',
            example: '100.00',
            description:
              'Positive decimal amount. Allowed decimal places depend on currency minor units.',
          },
          currency: {
            type: 'string',
            minLength: 3,
            maxLength: 3,
            pattern: '^[A-Za-z]{3}$',
            example: 'USD',
            description: 'Supported examples: USD, EUR, GBP, RUB, TRY, JPY, KWD.',
          },
          merchantId: {
            type: 'string',
            example: 'merchant-1',
          },
        },
      },
      Invoice: {
        type: 'object',
        required: [
          'invoiceId',
          'merchantId',
          'amount',
          'currency',
          'feePercent',
          'fee',
          'amountToReceive',
          'status',
        ],
        properties: {
          invoiceId: { type: 'string', example: '665f6f1e8b3f3d49e57a6e11' },
          merchantId: { type: 'string', example: 'merchant-1' },
          amount: { type: 'string', example: '100.00' },
          currency: { type: 'string', example: 'USD' },
          feePercent: { type: 'string', example: '2.5' },
          fee: { type: 'string', example: '2.50' },
          amountToReceive: { type: 'string', example: '97.50' },
          status: {
            type: 'string',
            enum: ['pending', 'paid', 'failed'],
            example: 'pending',
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['message'],
            properties: {
              message: { type: 'string', example: 'Merchant not found' },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    path: { type: 'string', example: 'amount' },
                    message: { type: 'string', example: 'Invalid input' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

export default openApiSpec;
