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
    {
      name: 'Webhooks',
      description: 'Payment provider notifications',
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
    '/webhook': {
      post: {
        tags: ['Webhooks'],
        summary: 'Receive payment status webhook',
        description:
          'Receives a signed payment status notification from the payment provider.',
        parameters: [
          {
            name: 'X-Signature',
            in: 'header',
            required: true,
            schema: {
              type: 'string',
              example: 'sha256=8f5d...',
            },
            description: 'HMAC-SHA256 signature of the raw JSON request body.',
          },
          {
            name: 'X-Timestamp',
            in: 'header',
            required: true,
            schema: {
              type: 'string',
              example: '1765140900000',
            },
            description: 'Unix timestamp in milliseconds or seconds.',
          },
          {
            name: 'X-Nonce',
            in: 'header',
            required: true,
            schema: {
              type: 'string',
              example: '7f8a8b6d-3b6e-43d7-9b2a-7c20e21c5b41',
            },
            description: 'Unique request nonce stored temporarily in Redis.',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/WebhookRequest',
              },
              examples: {
                paid: {
                  summary: 'Paid invoice',
                  value: {
                    invoiceId: '665f6f1e8b3f3d49e57a6e11',
                    status: 'paid',
                  },
                },
                failed: {
                  summary: 'Failed invoice',
                  value: {
                    invoiceId: '665f6f1e8b3f3d49e57a6e11',
                    status: 'failed',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Webhook accepted',
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
            description: 'Invalid request body or invoice id',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '401': {
            description: 'Invalid signature or timestamp',
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
          '409': {
            description: 'Duplicate nonce or conflicting final invoice status',
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
      WebhookRequest: {
        type: 'object',
        required: ['invoiceId', 'status'],
        additionalProperties: false,
        properties: {
          invoiceId: {
            type: 'string',
            example: '665f6f1e8b3f3d49e57a6e11',
          },
          status: {
            type: 'string',
            enum: ['paid', 'failed'],
            example: 'paid',
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
