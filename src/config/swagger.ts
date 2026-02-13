import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Complaint Box API',
            version: '1.0.0',
            description: 'A comprehensive API for managing student complaints in educational institutions',
            contact: {
                name: 'API Support',
                email: 'support@complaintbox.com',
            },
        },
        servers: [
            {
                url: process.env.API_URL || 'http://localhost:3000',
                description: 'Development server',
            },
            {
                url: 'https://your-production-url.vercel.app',
                description: 'Production server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT token in the format: Bearer <token>',
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        _id: {
                            type: 'string',
                            description: 'User ID',
                        },
                        name: {
                            type: 'string',
                            description: 'User full name',
                        },
                        username: {
                            type: 'string',
                            description: 'Unique username',
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'User email address',
                        },
                        role: {
                            type: 'string',
                            enum: ['student', 'faculty', 'admin'],
                            description: 'User role',
                        },
                        department: {
                            type: 'string',
                            description: 'Department name',
                        },
                        profilePicture: {
                            type: 'string',
                            description: 'URL or base64 of profile picture',
                        },
                        yearOfStudy: {
                            type: 'string',
                            description: 'Year of study (for students)',
                        },
                        program: {
                            type: 'string',
                            description: 'Program/course name',
                        },
                        phoneNumber: {
                            type: 'string',
                            description: 'Contact number',
                        },
                    },
                },
                Complaint: {
                    type: 'object',
                    properties: {
                        _id: {
                            type: 'string',
                            description: 'Complaint MongoDB ID',
                        },
                        complaintId: {
                            type: 'string',
                            description: 'Human-readable complaint ID',
                        },
                        title: {
                            type: 'string',
                            description: 'Complaint title',
                            maxLength: 100,
                        },
                        description: {
                            type: 'string',
                            description: 'Detailed complaint description',
                            maxLength: 1000,
                        },
                        category: {
                            type: 'string',
                            description: 'Complaint category',
                        },
                        status: {
                            type: 'string',
                            enum: ['submitted', 'in_review', 'need_clarification', 'assigned', 'resolved', 'escalated'],
                            description: 'Current complaint status',
                        },
                        studentId: {
                            type: 'string',
                            description: 'Student who created the complaint',
                        },
                        studentName: {
                            type: 'string',
                            description: 'Student name',
                        },
                        studentUsername: {
                            type: 'string',
                            description: 'Student username',
                        },
                        assignedTo: {
                            type: 'string',
                            description: 'Faculty member assigned to the complaint',
                        },
                        department: {
                            type: 'string',
                            description: 'Department related to complaint',
                        },
                        yearOfStudy: {
                            type: 'string',
                            description: 'Student year of study',
                        },
                        attachment: {
                            type: 'string',
                            description: 'Base64 encoded attachment',
                        },
                        clarificationMessage: {
                            type: 'string',
                            description: 'Message requesting clarification',
                        },
                        isRead: {
                            type: 'boolean',
                            description: 'Whether complaint has been read',
                        },
                        readBy: {
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                            description: 'Array of user IDs who have read the complaint',
                        },
                        history: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    status: {
                                        type: 'string',
                                    },
                                    date: {
                                        type: 'string',
                                        format: 'date-time',
                                    },
                                    updatedBy: {
                                        type: 'string',
                                    },
                                    note: {
                                        type: 'string',
                                    },
                                },
                            },
                            description: 'Status change history',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string',
                            description: 'Error message',
                        },
                        errors: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    msg: {
                                        type: 'string',
                                    },
                                    param: {
                                        type: 'string',
                                    },
                                },
                            },
                            description: 'Validation errors',
                        },
                    },
                },
                Success: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            description: 'Success message',
                        },
                    },
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.ts', './src/server.ts'], // Path to the API routes
};

export const swaggerSpec = swaggerJsdoc(options);
