interface Ten10LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showText?: boolean
}

export function Ten10Logo({ size = 'md', className = '', showText = false }: Ten10LogoProps) {
  const logoSizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl', 
    lg: 'text-4xl'
  }
  
  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl'
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Ten10 Logo - Actual Ten10 branding */}
      <div className={`flex items-center ${logoSizeClasses[size]} font-semibold leading-none`}>
        <span className="text-gray-600 dark:text-gray-400">Ten</span>
        <span className="text-purple-600">10</span>
      </div>
      
      {showText && (
        <div className="flex items-center">
          <span className={`text-blue-600 ${textSizeClasses[size]} font-medium`}>
            .com
          </span>
        </div>
      )}
    </div>
  )
}