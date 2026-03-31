import { defineStore } from 'pinia';
import apiClient from '@shared/utils/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const useShopStore = defineStore('shop', {
    state: () => ({
        products: {}, // Store products by ID { productId: productData }
        productsBySystem: {}, // Track which products belong to which gaming system { systemId: [productIds] }
        loadingBySystem: {}, // Track loading state per system { systemId: boolean }
        error: null,
        loaded: false
    }),

    getters: {
        /**
         * Get all products as an array
         */
        allProducts: (state) => {
            return Object.values(state.products);
        },

        /**
         * Get products by gaming system ID
         */
        getProductsBySystemId: (state) => (systemId) => {
            const productIds = state.productsBySystem[systemId] || [];
            return productIds.map(id => state.products[id]).filter(Boolean);
        },

        /**
         * Get a product by ID
         */
        getProductById: (state) => (id) => {
            return state.products[id] || null;
        },

        /**
         * Get product name by ID
         */
        getProductNameById: (state) => (id) => {
            const product = state.products[id];
            return product?.DisplayTitle || product?.Name || 'Unknown Product';
        },

        /**
         * Get product count for a gaming system
         */
        getProductCount: (state) => (systemId) => {
            return (state.productsBySystem[systemId] || []).length;
        },

        /**
         * Check if products are loaded for a specific system
         */
        isSystemLoaded: (state) => (systemId) => {
            return !!state.productsBySystem[systemId];
        },

        /**
         * Check if products are loading for a specific system
         */
        isSystemLoading: (state) => (systemId) => {
            return state.loadingBySystem[systemId] || false;
        },

        /**
         * Check if any products are loaded
         */
        isLoaded: (state) => state.loaded
    },

    actions: {
        /**
         * Fetch products for a specific gaming system from the API
         * @param {string} systemId - Gaming system ID
         * @param {boolean} force - Force refresh even if already loaded
         * @param {Object} options - Additional options
         * @param {boolean} options.includeArchived - Include archived products
         * @param {string} options.source - Source identifier (e.g., 'realm-create')
         */
        async fetchSystemProducts(systemId, force = false, options = {}) {
            // Don't refetch if already loaded unless forced
            if (!force && this.productsBySystem[systemId]) {
                return;
            }

            this.loadingBySystem[systemId] = true;
            this.error = null;

            try {
                const params = {};
                if (options.includeArchived) {
                    params.includeArchived = 'true';
                }
                if (options.source) {
                    params.source = options.source;
                }

                const response = await apiClient.get(`${API_BASE_URL}/shop/systems/system/${systemId}`, { params });

                // Handle different response formats
                const data = response.data;
                let productsArray = [];

                if (Array.isArray(data)) {
                    productsArray = data;
                } else if (data && Array.isArray(data.products)) {
                    productsArray = data.products;
                } else if (data && Array.isArray(data.Items)) {
                    productsArray = data.Items;
                }

                // Store products and track by system
                const productIds = [];
                productsArray.forEach(product => {
                    if (product.ID) {
                        this.products[product.ID] = product;
                        productIds.push(product.ID);
                    }
                });

                // Update the system mapping
                this.productsBySystem[systemId] = productIds;
                this.loaded = true;

                console.log(`Shop products loaded for system ${systemId}:`, productIds.length);
            } catch (err) {
                console.error(`Error fetching shop products for system ${systemId}:`, err);
                this.error = err.response?.data?.message || 'Failed to load shop products';
                // Ensure productsBySystem has an empty array for this system on error
                if (!this.productsBySystem[systemId]) {
                    this.productsBySystem[systemId] = [];
                }
                throw err;
            } finally {
                this.loadingBySystem[systemId] = false;
            }
        },

        /**
         * Refresh products for a specific gaming system (force reload)
         * @param {string} systemId - Gaming system ID
         * @param {boolean} includeArchived - Include archived products
         */
        async refreshSystemProducts(systemId, includeArchived = false) {
            await this.fetchSystemProducts(systemId, true, includeArchived);
        },

        /**
         * Clear products for a specific gaming system
         * @param {string} systemId - Gaming system ID
         */
        clearSystemProducts(systemId) {
            const productIds = this.productsBySystem[systemId] || [];

            // Remove products from the main store
            productIds.forEach(productId => {
                delete this.products[productId];
            });

            // Remove system mapping
            delete this.productsBySystem[systemId];
            delete this.loadingBySystem[systemId];

            this.error = null;
        },

        /**
         * Clear all products data
         */
        clearAllProducts() {
            this.products = {};
            this.productsBySystem = {};
            this.loadingBySystem = {};
            this.loaded = false;
            this.error = null;
        },

        /**
         * Update a product in the store cache
         * @param {string} productId - The ID of the product to update
         * @param {Object} updatedProduct - The updated product data
         */
        updateProductInStore(productId, updatedProduct) {
            if (updatedProduct && updatedProduct.ID) {
                this.products[productId] = updatedProduct;
                console.log(`Updated product in store: ${updatedProduct.Name}`);
            } else {
                console.warn(`Invalid product data for ${productId} - cannot update store`);
            }
        },

        /**
         * Add a new product to the store cache
         * @param {Object} newProduct - The new product data
         * @param {string} systemId - The gaming system ID this product belongs to
         */
        addProductToStore(newProduct, systemId) {
            if (newProduct && newProduct.ID) {
                this.products[newProduct.ID] = newProduct;

                // Add to system mapping if system is tracked
                if (systemId && this.productsBySystem[systemId]) {
                    if (!this.productsBySystem[systemId].includes(newProduct.ID)) {
                        this.productsBySystem[systemId].push(newProduct.ID);
                    }
                }

                console.log(`Added product to store: ${newProduct.Name}`);
            } else {
                console.warn('Invalid product data - cannot add to store');
            }
        },

        /**
         * Delete a product from the store cache
         * @param {string} productId - The ID of the product to delete
         */
        deleteProductFromStore(productId) {
            // Remove from main store
            delete this.products[productId];

            // Remove from all system mappings
            Object.keys(this.productsBySystem).forEach(systemId => {
                const index = this.productsBySystem[systemId].indexOf(productId);
                if (index > -1) {
                    this.productsBySystem[systemId].splice(index, 1);
                }
            });

            console.log(`Deleted product from store: ${productId}`);
        },

        /**
         * Get a specific product by ID, fetching from API if not cached
         * @param {string} productId - Product ID
         * @param {boolean} force - Force refresh from API
         */
        async getProduct(productId, force = false) {
            // Check if we have a cached product
            const cachedProduct = this.products[productId];
            if (cachedProduct && !force) {
                return cachedProduct;
            }

            // Fetch from API
            try {
                const response = await apiClient.get(`${API_BASE_URL}/shop/products/product/${productId}`);

                if (response.status >= 200 && response.status < 300) {
                    const productData = response.data.product || response.data;

                    // Cache the product
                    if (productData.ID) {
                        this.products[productData.ID] = productData;
                    }

                    return productData;
                } else {
                    throw new Error(`Failed to load product: ${response.status}`);
                }
            } catch (error) {
                console.error(`Failed to fetch product ${productId}:`, error);
                this.error = error.response?.data?.message || error.message;
                throw error;
            }
        }
    }
});
