export const secureGatewayClient = {
  get: () => Promise.resolve({ success: true, data: null }),
  delete: () => Promise.resolve({ success: true, data: null }),
  mutate: () => Promise.resolve({ success: true, data: null })
};