import React from 'react'
import { Sidebar } from '@/components/Sidebar'

const Templates = () => {
  return (
    <div className="flex h-screen bg-background">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <span className="text-3xl font-bold tracking-tight text-foreground p-8">
                    Custom templates will appear soon. 
                </span>
            </div>
    </div>
  )
}

export default Templates