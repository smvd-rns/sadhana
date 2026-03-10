import DeleteFileManager from './components/DeleteFileManager'
import ScrollReveal from '../../components/ui/ScrollReveal'

export default function DeleteFilesPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/50">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-96 h-96 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute top-40 right-10 w-96 h-96 bg-amber-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-1/2 w-96 h-96 bg-red-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <ScrollReveal direction="down">
                    <div className="mb-10 text-center">
                        <h1 className="text-4xl md:text-5xl font-bold font-outfit bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-4">
                            Manage & Delete Files
                        </h1>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Efficiently cleanup your storage by selecting and deleting multiple files at once.
                        </p>
                    </div>
                </ScrollReveal>

                <DeleteFileManager />
            </div>
        </div>
    )
}
