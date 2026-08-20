import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import { Home } from '@/routes/Home'
import { Root } from '@/routes/Root'
import { Study } from '@/routes/Study'
import { createLearnerStore } from '@/storage/local'
import { LearnerStoreContext } from '@/storage/useLearnerStore'

// Read once at startup: local storage is the working copy, and reading it
// synchronously is why the first screen can show real progress with no spinner.
const { store, discardedReason } = createLearnerStore()

const router = createBrowserRouter([
  {
    element: <Root discardedReason={discardedReason} />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/study', element: <Study /> },
    ],
  },
])

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('missing #root element')

createRoot(rootElement).render(
  <StrictMode>
    <LearnerStoreContext.Provider value={store}>
      <RouterProvider router={router} />
    </LearnerStoreContext.Provider>
  </StrictMode>,
)
