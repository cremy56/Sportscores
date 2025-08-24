// The issue is in this part of your handleValidatieTaak function:

const handleValidatieTaak = async (weekNummer, taakIndex, gevalideerd) => {
    if (!actiefSchema || !isTeacherOrAdmin) return;

    try {
        const taakId = `week${weekNummer}_taak${taakIndex}`;
        const updatedVoltooide = {
            ...actiefSchema.voltooide_taken,
            [taakId]: {
                ...actiefSchema.voltooide_taken[taakId],
                gevalideerd: gevalideerd,
                gevalideerd_door: profile.naam || profile.email,
                gevalideerd_op: new Date().toISOString()
            }
        };

        const actiefSchemaRef = doc(db, 'leerling_schemas', schemaId);
        
        // --- FIXED LOGIC ---
        let nieuweHuidigeWeek = actiefSchema.huidige_week;

        // Only proceed to next week if we're validating (not rejecting) AND it's the current week
        if (gevalideerd && weekNummer === actiefSchema.huidige_week) {
            // 1. Get the week data for the CURRENT week
            const weekDataToCheck = schemaDetails.weken.find(w => w.week_nummer === actiefSchema.huidige_week);

            if (weekDataToCheck) {
                const totaleTakenInHuidigeWeek = weekDataToCheck.taken.length;
                
                // 2. Count all validated tasks in the current week (including the one we just updated)
                const gevalideerdeTakenInHuidigeWeek = weekDataToCheck.taken.filter((_, index) => {
                    const idToCheck = `week${actiefSchema.huidige_week}_taak${index}`;
                    // Use the updated data to check validation status
                    return updatedVoltooide[idToCheck]?.gevalideerd === true;
                }).length;

                // 3. If all tasks in the current week are validated, move to next week
                if (gevalideerdeTakenInHuidigeWeek === totaleTakenInHuidigeWeek) {
                    // Check if there's a next week available
                    const nextWeekExists = schemaDetails.weken.some(w => w.week_nummer === actiefSchema.huidige_week + 1);
                    
                    if (nextWeekExists) {
                        nieuweHuidigeWeek = actiefSchema.huidige_week + 1;
                        toast.success(`🎉 Week ${actiefSchema.huidige_week} voltooid! Door naar week ${nieuweHuidigeWeek}.`, { 
                            duration: 5000,
                            style: {
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                fontWeight: 'bold'
                            }
                        });
                    } else {
                        // All weeks completed
                        toast.success(`🏆 Alle weken voltooid! Training afgerond!`, { 
                            duration: 6000,
                            style: {
                                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                                color: 'white',
                                fontWeight: 'bold'
                            }
                        });
                    }
                }
            }
        }
        
        // 4. Update both the tasks and the (possibly new) current week
        await updateDoc(actiefSchemaRef, {
            voltooide_taken: updatedVoltooide,
            huidige_week: nieuweHuidigeWeek
        });

        // 5. Update local state to refresh UI immediately
        setActiefSchema(prev => ({
            ...prev,
            voltooide_taken: updatedVoltooide,
            huidige_week: nieuweHuidigeWeek
        }));

        // If validated, give badge with visual feedback
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
    } catch (error) {
        console.error("Fout bij valideren taak:", error);
        toast.error("Kon de taak niet valideren.");
    }
};

// Additional debugging function you can add to check the current state:
const debugWeekProgression = () => {
    console.log("=== DEBUG WEEK PROGRESSION ===");
    console.log("Huidige week:", actiefSchema?.huidige_week);
    console.log("Schema weken:", schemaDetails?.weken?.map(w => w.week_nummer));
    console.log("Voltooide taken:", actiefSchema?.voltooide_taken);
    
    if (actiefSchema && schemaDetails) {
        schemaDetails.weken.forEach(week => {
            const completedInWeek = week.taken.filter((_, index) => {
                const taakId = `week${week.week_nummer}_taak${index}`;
                return actiefSchema.voltooide_taken?.[taakId]?.gevalideerd === true;
            }).length;
            console.log(`Week ${week.week_nummer}: ${completedInWeek}/${week.taken.length} taken gevalideerd`);
        });
    }
    console.log("===============================");
};