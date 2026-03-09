import { NextRequest, NextResponse } from 'next/server'

// Extract media URL from Twitter/X posts
async function extractTwitterMedia(url: string): Promise<string | null> {
  try {
    // Try to get the tweet ID from various URL formats
    const tweetIdMatch = url.match(/status\/(\d+)/) || url.match(/\/i\/status\/(\d+)/)
    if (!tweetIdMatch) return null
    
    const tweetId = tweetIdMatch[1]
    
    // Use Twitter's syndication API to get tweet data (no auth required)
    const syndicationUrl = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&token=0`
    const response = await fetch(syndicationUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    })
    
    if (!response.ok) return null
    
    const data = await response.json()
    
    // Look for video/GIF in the tweet data
    if (data.video?.variants) {
      // Find the highest quality MP4 variant
      const mp4Variants = data.video.variants
        .filter((v: { type?: string; src?: string }) => v.type === 'video/mp4' || v.src?.includes('.mp4'))
        .sort((a: { bitrate?: number }, b: { bitrate?: number }) => (b.bitrate || 0) - (a.bitrate || 0))
      
      if (mp4Variants.length > 0) {
        return mp4Variants[0].src
      }
    }
    
    // Check for media_details (animated GIF stored as video)
    if (data.mediaDetails?.[0]?.video_info?.variants) {
      const variants = data.mediaDetails[0].video_info.variants
        .filter((v: { content_type?: string; url?: string }) => v.content_type === 'video/mp4')
        .sort((a: { bitrate?: number }, b: { bitrate?: number }) => (b.bitrate || 0) - (a.bitrate || 0))
      
      if (variants.length > 0) {
        return variants[0].url
      }
    }
    
    // Check for photos (in case it's actually a static image)
    if (data.photos?.[0]?.url) {
      return data.photos[0].url
    }
    
    return null
  } catch (e) {
    console.error('Twitter extraction error:', e)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }
    
    let fetchUrl = url
    
    // Check if it's a Twitter/X URL and try to extract media
    const isTwitterUrl = /^https?:\/\/(www\.)?(twitter|x)\.com\//i.test(url)
    if (isTwitterUrl) {
      const mediaUrl = await extractTwitterMedia(url)
      if (mediaUrl) {
        fetchUrl = mediaUrl
      } else {
        return NextResponse.json({ 
          error: 'Could not extract media from this Twitter/X post.',
          hint: 'The post may not contain a GIF/video, or it may be protected. Try right-clicking the GIF and selecting "Copy video address".'
        }, { status: 400 })
      }
    }
    
    // Check other social media platforms
    const socialMediaPatterns = [
      { pattern: /^https?:\/\/(www\.)?instagram\.com\/(p|reel)\/[^/]+/i, name: 'Instagram', hint: 'Instagram does not allow direct GIF downloads. Try using a GIF from another source.' },
      { pattern: /^https?:\/\/(www\.)?facebook\.com\//i, name: 'Facebook', hint: 'Facebook does not allow direct GIF downloads. Try using a GIF from another source.' },
      { pattern: /^https?:\/\/(www\.)?tiktok\.com\//i, name: 'TikTok', hint: 'TikTok does not support GIFs. Try using a GIF from another source.' },
    ]
    
    for (const { pattern, name, hint } of socialMediaPatterns) {
      if (pattern.test(url)) {
        return NextResponse.json({ 
          error: `This appears to be a ${name} post URL, not a direct GIF link.`,
          hint 
        }, { status: 400 })
      }
    }
    
    // Fetch the URL with redirects
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/gif, image/webp, image/*;q=0.9, */*;q=0.8',
      },
    })
    
    if (!response.ok) {
      return NextResponse.json({ 
        error: `Failed to fetch: ${response.status} ${response.statusText}` 
      }, { status: response.status })
    }
    
    const contentType = response.headers.get('content-type') || ''
    const finalUrl = response.url
    const buffer = await response.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    
    // Check magic bytes for GIF (GIF87a or GIF89a)
    const isGif = bytes.length >= 6 && 
      bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && // "GIF"
      bytes[3] === 0x38 && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61 // "87a" or "89a"
    
    // Also check for common GIF indicators
    const isGifByType = contentType.includes('gif')
    const isGifByUrl = finalUrl.toLowerCase().includes('.gif')
    
    // Check if it's a video (Twitter converts GIFs to MP4)
    const isVideo = contentType.includes('video') || 
      finalUrl.toLowerCase().includes('.mp4') ||
      finalUrl.toLowerCase().includes('.webm')
    
    if (!isGif && !isGifByType && !isGifByUrl) {
      // If it's a video from Twitter, that's expected (Twitter converts GIFs to MP4)
      // We'll return an error since we can't process MP4 as GIF frames without conversion
      if (isVideo) {
        // For Twitter URLs, we extracted the video but it's MP4
        if (isTwitterUrl) {
          return NextResponse.json({ 
            error: 'Twitter converts GIFs to MP4 videos which cannot be displayed as a flipbook.',
            hint: 'Try using a GIF from giphy.com, tenor.com, or another GIF hosting site that provides actual .gif files.'
          }, { status: 400 })
        }
        
        return NextResponse.json({ 
          error: 'This URL points to a video file, not a GIF.',
          hint: 'Flipbook only supports GIF files. Try using a GIF from giphy.com or tenor.com.'
        }, { status: 400 })
      }
      
      return NextResponse.json({ 
        error: 'URL does not point to a GIF image',
        hint: 'Make sure you\'re using a direct link to a .gif file. Try right-clicking the GIF and selecting "Copy image address".'
      }, { status: 400 })
    }
    
    // Return the GIF data as base64
    const base64 = Buffer.from(buffer).toString('base64')
    const fileName = finalUrl.split('/').pop()?.split('?')[0] || 'image.gif'
    
    return NextResponse.json({ 
      data: base64,
      contentType: 'image/gif',
      fileName: fileName.endsWith('.gif') ? fileName : `${fileName}.gif`
    })
    
  } catch (error) {
    console.error('Fetch GIF error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch GIF',
      hint: 'The URL may be blocked or invalid. Try using a direct GIF link.'
    }, { status: 500 })
  }
}
