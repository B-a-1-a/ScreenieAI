import type { ExportResult } from '../types/project'

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
  exportResult: ExportResult | null
  availableIdes: string[]
  onOpenInIde: (ide: string) => void
  isBusy: boolean
}

const IDE_LABELS: Record<string, string> = {
  cursor: 'Cursor',
  code: 'VS Code',
  windsurf: 'Windsurf',
}

export function ExportDialog({
  isOpen,
  onClose,
  exportResult,
  availableIdes,
  onOpenInIde,
  isBusy,
}: ExportDialogProps) {
  if (!isOpen || !exportResult) {
    return null
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Export Complete</h2>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          <label className="field-label">Export Location</label>
          <p className="export-root-path">{exportResult.exportRoot}</p>

          <label className="field-label">
            Exported Files ({exportResult.files.length})
          </label>
          <ul className="export-file-list">
            {exportResult.files.map((file) => (
              <li key={file}>{file}</li>
            ))}
          </ul>

          {availableIdes.length > 0 && (
            <>
              <label className="field-label">Open in IDE</label>
              <div className="ide-buttons">
                {availableIdes.map((ide) => (
                  <button
                    key={ide}
                    type="button"
                    disabled={isBusy}
                    onClick={() => onOpenInIde(ide)}
                  >
                    {IDE_LABELS[ide] ?? ide}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
