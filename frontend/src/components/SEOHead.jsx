import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * SEO Head Component - Updates page title and meta tags dynamically
 */
export default function SEOHead({ title, description, keywords, ogImage }) {
  const location = useLocation()

  useEffect(() => {
    // Update document title
    if (title) {
      document.title = title
    }

    // Update meta description
    if (description) {
      let metaDescription = document.querySelector('meta[name="description"]')
      if (!metaDescription) {
        metaDescription = document.createElement('meta')
        metaDescription.setAttribute('name', 'description')
        document.head.appendChild(metaDescription)
      }
      metaDescription.setAttribute('content', description)
    }

    // Update Open Graph tags
    if (title) {
      let ogTitle = document.querySelector('meta[property="og:title"]')
      if (!ogTitle) {
        ogTitle = document.createElement('meta')
        ogTitle.setAttribute('property', 'og:title')
        document.head.appendChild(ogTitle)
      }
      ogTitle.setAttribute('content', title)
    }

    if (description) {
      let ogDescription = document.querySelector('meta[property="og:description"]')
      if (!ogDescription) {
        ogDescription = document.createElement('meta')
        ogDescription.setAttribute('property', 'og:description')
        document.head.appendChild(ogDescription)
      }
      ogDescription.setAttribute('content', description)
    }

    // Update canonical URL
    const canonicalUrl = `https://www.petbehaviortranslator.com${location.pathname}`
    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', canonicalUrl)

    // Update Open Graph URL
    let ogUrl = document.querySelector('meta[property="og:url"]')
    if (!ogUrl) {
      ogUrl = document.createElement('meta')
      ogUrl.setAttribute('property', 'og:url')
      document.head.appendChild(ogUrl)
    }
    ogUrl.setAttribute('content', canonicalUrl)
  }, [title, description, keywords, ogImage, location.pathname])

  return null // This component doesn't render anything
}

