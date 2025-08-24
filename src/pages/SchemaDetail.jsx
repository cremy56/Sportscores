// Vervang je handleValidatieTaak functie met deze versie die debug logging bevat:

const handleValidatieTaak = async (weekNummer, taakIndex, gevalideerd) => {
    if (!actiefSchema || !isTeacherOrAdmin) return;

    console.log("=== DEBUG START handleValidatieTaak ===");
    console.log("Week nummer:", weekNummer);
    console.log("Taak index:", taakIndex);
    console.log("Gevalideerd:", gevalideerd);
    console.log("Huidige week voor update:", actiefSchema.huidige_week);
    console.log("Alle weken in schema:", schemaDetails?.weken?.map(w => w.week_nummer));

    try {
        const taakId = `week${weekNummer}_taak${taakIndex}`;
        console.log("Taak ID:", taakId);
        
        // Update de taak data
        const updatedVoltooide = {
            ...actiefSchema.voltooide_taken,
            [taakId]: {
                ...actiefSchema.voltooide_taken[taakId],
                gevalideerd: gevalideerd,
                gevalideerd_door: profile.naam || profile.email,
                gevalideerd_op: new Date().toISOString()
            }
        };

        console.log("Updated voltooide taken:", updatedVoltooide);

        const actiefSchemaRef = doc(db, 'leerling_schemas', schemaId);
        
        let nieuweHuidigeWeek = actiefSchema.huidige_week;

        // Alleen doorgaan naar volgende week als we valideren EN het de huidige week is
        if (gevalideerd && weekNummer === actiefSchema.huidige_week) {
            console.log("Checking if current week is completed...");
            
            // Vind de huidige week data
            const weekDataToCheck = schemaDetails.weken.find(w => w.week_nummer === actiefSchema.huidige_week);
            console.log("Week data to check:", weekDataToCheck);

            if (weekDataToCheck) {
                const totaleTakenInHuidigeWeek = weekDataToCheck.taken.length;
                console.log("Totale taken in huidige week:", totaleTakenInHuidigeWeek);
                
                // Tel alle gevalideerde taken in de huidige week
                let gevalideerdeTakenCount = 0;
                weekDataToCheck.taken.forEach((_, index) => {
                    const idToCheck = `week${actiefSchema.huidige_week}_taak${index}`;
                    const isValidated = updatedVoltooide[idToCheck]?.gevalideerd === true;
                    console.log(`Taak ${idToCheck}: gevalideerd = ${isValidated}`);
                    if (isValidated) {
                        gevalideerdeTakenCount++;
                    }
                });

                console.log(`Gevalideerde taken in week ${actiefSchema.huidige_week}: ${gevalideerdeTakenCount}/${totaleTakenInHuidigeWeek}`);

                // Als alle taken in de huidige week gevalideerd zijn
                if (gevalideerdeTakenCount === totaleTakenInHuidigeWeek) {
                    console.log("Week is volledig! Checking for next week...");
                    
                    // Check of er een volgende week bestaat
                    const volgendeWeekNummer = actiefSchema.huidige_week + 1;
                    const nextWeekExists = schemaDetails.weken.some(w => w.week_nummer === volgendeWeekNummer);
                    
                    console.log("Volgende week nummer:", volgendeWeekNummer);
                    console.log("Next week exists:", nextWeekExists);
                    
                    if (nextWeekExists) {
                        nieuweHuidigeWeek = volgendeWeekNummer;
                        console.log("Moving to next week:", nieuweHuidigeWeek);
                        
                        toast.success(`🎉 Week ${actiefSchema.huidige_week} voltooid! Door naar week ${nieuweHuidigeWeek}.`, { 
                            duration: 5000,
                            style: {
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                fontWeight: 'bold'
                            }
                        });
                    } else {
                        console.log("Alle weken voltooid!");
                        toast.success(`🏆 Alle weken voltooid! Training afgerond!`, { 
                            duration: 6000,
                            style: {
                                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                                color: 'white',
                                fontWeight: 'bold'
                            }
                        });
                    }
                } else {
                    console.log("Week nog niet volledig, blijven op huidige week");
                }
            } else {
                console.error("Kon week data niet vinden voor week:", actiefSchema.huidige_week);
            }
        } else {
            console.log("Niet doorgan naar volgende week omdat:", {
                gevalideerd,
                weekNummer,
                huidigeWeek: actiefSchema.huidige_week,
                isCurrentWeek: weekNummer === actiefSchema.huidige_week
            });
        }
        
        console.log("Nieuwe huidige week wordt:", nieuweHuidigeWeek);
        
        // Update database
        await updateDoc(actiefSchemaRef, {
            voltooide_taken: updatedVoltooide,
            huidige_week: nieuweHuidigeWeek
        });

        console.log("Database updated successfully");

        // Update lokale state
        setActiefSchema(prev => ({
            ...prev,
            voltooide_taken: updatedVoltooide,
            huidige_week: nieuweHuidigeWeek
        }));

        console.log("Local state updated");

        // Badge toekennen als gevalideerd
        if (gevalideerd) {
            await geefTrainingsbadge(taakId);
            toast.success("🏆 Taak gevalideerd! Leerling ontvangt een trainingsbadge!", {
                duration: 5000,
                style: {
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    color: 'white',
                    fontWeight: 'bold'
                }
            });
        } else {
            toast.success("Validatie bijgewerkt.");
        }

        console.log("=== DEBUG END handleValidatieTaak ===");
        
    } catch (error) {
        console.error("Fout bij valideren taak:", error);
        toast.error("Kon de taak niet valideren.");
    }
};

// Ook deze debug functie toevoegen aan je component (bijvoorbeeld in useEffect):
const debugCurrentState = () => {
    console.log("=== CURRENT STATE DEBUG ===");
    console.log("Actief schema:", actiefSchema);
    console.log("Schema details:", schemaDetails);
    console.log("Huidige week:", actiefSchema?.huidige_week);
    console.log("Voltooide taken:", actiefSchema?.voltooide_taken);
    
    if (actiefSchema && schemaDetails) {
        schemaDetails.weken.forEach(week => {
            const completedInWeek = week.taken.filter((_, index) => {
                const taakId = `week${week.week_nummer}_taak${index}`;
                const taakData = actiefSchema.voltooide_taken?.[taakId];
                return taakData?.gevalideerd === true;
            }).length;
            console.log(`Week ${week.week_nummer}: ${completedInWeek}/${week.taken.length} taken gevalideerd`);
        });
    }
    console.log("============================");
};

// Voeg deze toe aan je useEffect om de state te debuggen:
useEffect(() => {
    if (actiefSchema && schemaDetails) {
        debugCurrentState();
    }
}, [actiefSchema, schemaDetails]);