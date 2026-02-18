import React from 'react'
import { Sidebar } from '@/components/Sidebar'

const Settings = () => {
  return (
    <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
            <span className="text-3xl font-bold tracking-tight text-foreground p-8">
                The Settings page is yet to be coded 
            </span>
        </div>
    </div>
  )
}

export default Settings