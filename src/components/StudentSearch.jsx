// src/components/StudentSearch.jsx
// ✅ GEMIGREERD — zoeken via API (server ontsleutelt namen)
import { useState, useEffect } from 'react';
import { Combobox } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';

function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

export default function StudentSearch({
    onStudentSelect,
    schoolId,
    token,
    initialStudent = null,
    placeholder = "Zoek op naam...",
    compact = false
}) {
    const [queryText, setQueryText] = useState('');
    const [people, setPeople] = useState([]);
    const [selected, setSelected] = useState(initialStudent);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setSelected(initialStudent);
    }, [initialStudent]);

    useEffect(() => {
        if (queryText.length < 2 || !schoolId || !token) {
            setPeople([]);
            return;
        }

        const fetchPeople = async () => {
            setLoading(true);
            try {
                // ✅ Zoeken via API — server ontsleutelt namen
                const response = await fetch('/api/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        action: 'get_users',
                        schoolId,
                        filterRol: 'leerling'
                    })
                });

                if (!response.ok) throw new Error('Zoeken mislukt');
                const data = await response.json();
                const allStudents = data.users || [];

                // Filter client-side op zoekterm (namen zijn al ontsleuteld door server)
                const searchLower = queryText.toLowerCase();
                const filtered = allStudents
                    .filter(u => (u.decrypted_name || u.naam || '').toLowerCase().includes(searchLower))
                    .slice(0, 10)
                    .map(u => ({
                        id: u.id,                                    // smartschool_id_hash
                        naam: u.decrypted_name || u.naam || '[Naam]',
                        klas: u.klas || '',
                        school_id: schoolId
                    }));

                setPeople(filtered);
            } catch (error) {
                console.error('Fout bij zoeken leerlingen:', error);
                setPeople([]);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(fetchPeople, 300);
        return () => clearTimeout(timeoutId);
    }, [queryText, schoolId, token]);

    const handleSelect = (person) => {
        setSelected(person);
        onStudentSelect(person);
    };

    return (
        <Combobox as="div" value={selected} onChange={handleSelect}>
            <div className="relative">
                <Combobox.Input
                    className={compact
                        ? "w-full rounded-md border-0 bg-white py-1.5 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        : "w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:border-purple-500 focus:ring-purple-500 text-sm"
                    }
                    onChange={(event) => setQueryText(event.target.value)}
                    displayValue={(person) => person?.naam || ''}
                    placeholder={placeholder}
                />
                <Combobox.Button className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 focus:outline-none">
                    <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </Combobox.Button>

                {(people.length > 0 || loading) && (
                    <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                        {loading ? (
                            <div className="py-3 text-center text-sm text-gray-500">Zoeken...</div>
                        ) : (
                            people.map((person) => (
                                <Combobox.Option
                                    key={person.id}
                                    value={person}
                                    className={({ active }) =>
                                        classNames(
                                            'relative cursor-default select-none py-2 pl-3 pr-9',
                                            active ? 'bg-indigo-600 text-white' : 'text-gray-900'
                                        )
                                    }
                                >
                                    {({ active, selected }) => (
                                        <>
                                            <div>
                                                <span className={classNames('block truncate', selected && 'font-semibold')}>
                                                    {person.naam}
                                                </span>
                                                {person.klas && (
                                                    <span className={classNames('text-xs', active ? 'text-indigo-200' : 'text-gray-400')}>
                                                        {person.klas}
                                                    </span>
                                                )}
                                            </div>
                                            {selected && (
                                                <span className={classNames(
                                                    'absolute inset-y-0 right-0 flex items-center pr-4',
                                                    active ? 'text-white' : 'text-indigo-600'
                                                )}>
                                                    <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                                </span>
                                            )}
                                        </>
                                    )}
                                </Combobox.Option>
                            ))
                        )}
                    </Combobox.Options>
                )}
            </div>
        </Combobox>
    );
}