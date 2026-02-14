import React from 'react'

export default function Table({ columns = [], data = [] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
          <tr>
            {columns.map((col, i) => (
              <th key={i} className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                {typeof col.Header === 'function' ? col.Header() : col.Header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {data.map((row, idx) => (
            <tr key={idx} className="hover:bg-gray-50 transition-colors">
              {columns.map((col, j) => {
                let content
                if (typeof col.render === 'function') {
                  content = col.render(row)
                } else if (typeof col.accessor === 'function') {
                  content = col.accessor(row)
                } else if (col.accessor) {
                  content = row[col.accessor]
                } else {
                  content = null
                }
                return (
                  <td key={j} className="px-6 py-4">
                    {content}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}