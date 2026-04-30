import React from 'react'
import SearchBox from './components/SearchBox'

function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-12 px-4">
      <header className="mb-12 text-center animate-fade-in">
        <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600 mb-4">
          Bus PathFinder
        </h1>
        <p className="text-gray-400 text-lg max-w-md mx-auto">
          Encontra o caminho mais rápido entre as paragens da Covilhã.
        </p>
      </header>

      <main className="w-full">
        <SearchBox />
      </main>

      <footer className="mt-20 text-gray-500 text-sm">
        Dados oficiais da Covilhã Mobilidade
      </footer>
    </div>
  )
}

export default App
