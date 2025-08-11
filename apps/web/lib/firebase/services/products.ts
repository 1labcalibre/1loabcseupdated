import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore'
import { db } from '../config'

export interface ProductSpecification {
  property: string
  unit: string
  standard: string
  specification: string
  typicalValue: string | number
}

export interface Product {
  id?: string
  name: string
  category?: string
  internalCode?: string
  color?: string
  remark?: string
  specifications: ProductSpecification[]
  active: boolean
  createdAt?: any
  updatedAt?: any
}

const COLLECTION = 'products'

export const productsService = {
  // Get all products
  async getAll() {
    try {
      const q = query(collection(db, COLLECTION), orderBy('name'))
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[]
    } catch (error) {
      console.error('Error with ordered query, trying without orderBy:', error)
      // If it fails, try without orderBy
      const snapshot = await getDocs(collection(db, COLLECTION))
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[]
      // Sort manually
      return products.sort((a, b) => a.name.localeCompare(b.name))
    }
  },

  // Get active products only
  async getActive() {
    try {
      // Use only where clause to avoid composite index requirement
      const q = query(
        collection(db, COLLECTION), 
        where('active', '==', true)
      )
      const snapshot = await getDocs(q)
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[]
      // Sort manually to avoid index requirement
      return products.sort((a, b) => a.name.localeCompare(b.name))
    } catch (error) {
      console.error('Error fetching active products:', error)
      // Fallback to get all and filter manually
      const snapshot = await getDocs(collection(db, COLLECTION))
      const products = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[]
      
      return products
        .filter(p => p.active)
        .sort((a, b) => a.name.localeCompare(b.name))
    }
  },

  // Get single product
  async getById(id: string) {
    const docRef = doc(db, COLLECTION, id)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Product
    }
    return null
  },

  // Create product
  async create(product: Omit<Product, 'id'>) {
    const data = {
      ...product,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    const docRef = await addDoc(collection(db, COLLECTION), data)
    return docRef.id
  },

  // Update product
  async update(id: string, product: Partial<Product>) {
    const docRef = doc(db, COLLECTION, id)
    await updateDoc(docRef, {
      ...product,
      updatedAt: serverTimestamp()
    })
  },

  // Delete product
  async delete(id: string) {
    const docRef = doc(db, COLLECTION, id)
    await deleteDoc(docRef)
  },

  // Subscribe to products changes
  subscribe(callback: (products: Product[]) => void) {
    const q = query(collection(db, COLLECTION), orderBy('name'))
    return onSnapshot(q, (snapshot) => {
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[]
      callback(products)
    })
  }
} 